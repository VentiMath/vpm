"use strict";
const { Writable, PassThrough, pipeline } = require("node:stream");
const { createGzip } = require("node:zlib");
const duplexify = require("vduplexify");
const { HashStreamValidator } = require("./hash-stream-validator.js");
const { CRC32C } = require("./crc32c.js");
const { getMime } = require("./util.js");
const { snapshot, uploadPolicy } = require("./save.js");
const premature = () =>
  Object.assign(
    new Error("Upload closed before its response metadata arrived"),
    { code: "ERR_STREAM_PREMATURE_CLOSE" },
  );
const destroyed = () =>
  Object.assign(new Error("Upload stream was destroyed"), {
    code: "ERR_STREAM_DESTROYED",
  });

exports.createWriteStream = function createWriteStream(
  file,
  supplied = {},
  compressible,
) {
  const {
    RequestError,
    FileExceptionMessages: messages,
  } = require("./file.js");
  const options = snapshot(supplied);
  options.metadata ??= {};
  if (options.contentType) options.metadata.contentType = options.contentType;
  const validation =
    typeof options.validation === "string"
      ? options.validation.toLowerCase()
      : options.validation;
  const crc32c =
      validation !== false &&
      (typeof validation !== "string" || validation === "crc32c"),
    md5 = validation === "md5";
  if (options.offset && md5) throw new RangeError(messages.MD5_RESUMED_UPLOAD);
  if (
    options.offset &&
    crc32c &&
    !options.isPartialUpload &&
    !options.resumeCRC32C
  )
    throw new RangeError(messages.MISSING_RESUME_CRC32C_FINAL_UPLOAD);
  const policy = { ...(supplied[uploadPolicy] || file.storage.retryOptions) };
  if (
    !supplied[uploadPolicy] &&
    !file.shouldRetryBasedOnPreconditionAndIdempotencyStrat(
      options.preconditionOpts,
    )
  ) {
    policy.autoRetry = false;
    policy.maxRetries = 0;
  }
  options[uploadPolicy] = policy;
  const streams = [],
    listeners = [];
  let input,
    destination,
    hash,
    setup,
    metadata,
    hasMetadata = false,
    pipeFinished = false,
    verifying = false,
    writeCallback,
    finalCallback;
  const cancelOwned = (error) => {
    for (const stream of streams) if (!stream.destroyed) stream.destroy(error);
  };
  const fail = (error) => {
    if (!output.destroyed) output.destroy(error);
  };
  const owned = (stream) => {
    streams.push(stream);
    stream.on("error", () => {});
    return stream;
  };
  const listen = (event, callback, once = false) => {
    destination[once ? "once" : "on"](event, callback);
    listeners.push(() => destination.removeListener(event, callback));
  };
  function settleWrite(error) {
    const callback = writeCallback;
    writeCallback = undefined;
    callback?.(error);
  }
  async function validate() {
    if (!hash || options.isPartialUpload) return;
    const failed =
      (crc32c && (!metadata.crc32c || !hash.test("crc32c", metadata.crc32c))) ||
      (md5 && (!metadata.md5Hash || !hash.test("md5", metadata.md5Hash)));
    if (!failed) return;
    let code =
        md5 && !metadata.md5Hash ? "MD5_NOT_AVAILABLE" : "FILE_NO_UPLOAD",
      message =
        code === "MD5_NOT_AVAILABLE"
          ? messages.MD5_NOT_AVAILABLE
          : messages.UPLOAD_MISMATCH,
      errors = [];
    try {
      await file.delete();
    } catch (error) {
      code = "FILE_NO_UPLOAD_DELETE";
      message = messages.UPLOAD_MISMATCH_DELETE_FAIL + error.message;
      errors = [error];
    }
    const error = new RequestError(message);
    Object.assign(error, { code, errors });
    throw error;
  }
  function complete() {
    if (
      output.destroyed ||
      verifying ||
      !pipeFinished ||
      !finalCallback ||
      (!options.isPartialUpload && !hasMetadata)
    )
      return;
    verifying = true;
    Promise.resolve()
      .then(() => validate())
      .then(() => {
        if (output.destroyed) return;
        if (hash?.crc32c) output.emit("crc32c", hash.crc32c);
        const callback = finalCallback;
        finalCallback = undefined;
        callback?.();
      }, fail);
  }
  function begin() {
    if (setup) return setup;
    output.emit("writing");
    setup = (async () => {
      if (
        !options.metadata.contentType ||
        options.metadata.contentType === "auto"
      ) {
        const mime = await getMime();
        if (output.destroyed) return;
        const type = mime.getType(file.name);
        if (type) options.metadata.contentType = type;
      }
      if (output.destroyed) return;
      input = owned(new PassThrough());
      destination = owned(duplexify());
      input.once("data", () => output.emit("reading"));
      for (const event of ["uri", "progress", "response"])
        listen(event, (value) => {
          if (!output.destroyed) output.emit(event, value);
        });
      listen(
        "metadata",
        (value) => {
          metadata = { ...(value || file.metadata) };
          hasMetadata = true;
          complete();
        },
        true,
      );
      listen("error", fail);
      listen(
        "close",
        () => {
          if (!hasMetadata && !options.isPartialUpload && !output.destroyed)
            fail(destination.errored || premature());
        },
        true,
      );
      const transforms = [];
      const gzip =
        options.gzip === "auto"
          ? compressible.test(options.metadata.contentType || "")
          : options.gzip;
      if (gzip) {
        options.metadata.contentEncoding = "gzip";
        transforms.push(owned(createGzip()));
      }
      if (crc32c || md5) {
        hash = owned(
          new HashStreamValidator({
            crc32c,
            md5,
            updateHashesOnly: true,
            crc32cGenerator: file.crc32cGenerator,
            crc32cInstance: options.resumeCRC32C
              ? CRC32C.from(options.resumeCRC32C)
              : undefined,
          }),
        );
        transforms.push(hash);
      }
      // Install lifecycle listeners before the transport can synchronously fail.
      pipeline(input, ...transforms, destination, (error) => {
        if (error) fail(error);
        else {
          pipeFinished = true;
          complete();
        }
      });
      if (options.resumable === false)
        file.startSimpleUpload_(destination, options);
      else file.startResumableUpload_(destination, options);
    })();
    return setup;
  }
  const output = new Writable({
    write(chunk, encoding, callback) {
      writeCallback = callback;
      begin().then(
        () => {
          if (output.destroyed) {
            settleWrite(destroyed());
            return;
          }
          input.write(chunk, encoding, settleWrite);
        },
        (error) => {
          settleWrite(error);
          fail(error);
        },
      );
    },
    final(callback) {
      finalCallback = callback;
      begin().then(() => {
        if (output.destroyed) return;
        input.end();
        complete();
      }, fail);
    },
    destroy(error, callback) {
      const reason =
        error || (writeCallback || finalCallback ? premature() : undefined);
      for (const remove of listeners) remove();
      listeners.length = 0;
      cancelOwned(reason);
      settleWrite(reason || destroyed());
      const final = finalCallback;
      finalCallback = undefined;
      final?.(reason || destroyed());
      callback(reason);
    },
  });
  return output;
};
