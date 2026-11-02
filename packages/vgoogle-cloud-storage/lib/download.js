"use strict";
const { PassThrough, Transform, pipeline } = require("node:stream");
const { pipeline: pipe } = require("node:stream/promises");
const { createWriteStream } = require("node:fs");
const { createGunzip } = require("node:zlib");
const { createHash } = require("node:crypto");
const { snapshot } = require("./save.js");
const { FileExceptionMessages } = require("./errors.js");
const { open } = require("./transport.js");
exports.createReadStream = function createReadStream(file, supplied = {}) {
  const options = snapshot(supplied),
    range = options.start !== undefined || options.end !== undefined;
  if (range && options.validation !== undefined && options.validation !== false)
    throw Error(FileExceptionMessages.INVALID_VALIDATION_FILE_RANGE);
  const headers = {};
  if (range) {
    for (const n of [options.start, options.end])
      if (n !== undefined && !Number.isSafeInteger(n))
        throw RangeError("Download range must use integer offsets");
    if (options.start !== undefined && options.start < 0)
      throw RangeError("Download start must be nonnegative");
    if (options.end < 0) {
      if (options.start !== undefined)
        throw RangeError("Suffix ranges cannot include a start");
      headers.Range = "bytes=" + options.end;
    } else {
      if (options.end !== undefined && options.end < (options.start || 0))
        throw RangeError("Download end precedes start");
      headers.Range = `bytes=${options.start || 0}-${options.end ?? ""}`;
    }
  }
  const controller = new AbortController(),
    output = new PassThrough();
  let started = false;
  const originalRead = output._read,
    originalDestroy = output._destroy;
  output._read = function (size) {
    if (!started) {
      started = true;
      void begin();
    }
    return originalRead.call(this, size);
  };
  output._destroy = function (error, callback) {
    controller.abort(error || null);
    originalDestroy.call(this, error, callback);
  };
  async function begin() {
    try {
      const { stream, response } = await open(
        file.storage,
        file._options({
          method: "GET",
          qs: { alt: "media", ...options.queryParams },
          headers,
          signal: controller.signal,
          gzip: false,
          timeout: options.timeout,
        }),
      );
      if (output.destroyed) {
        stream.destroy();
        return;
      }
      output.emit("response", response);
      if (output.destroyed) {
        stream.destroy();
        return;
      }
      const hashes = Object.fromEntries(
        String(response.headers["x-goog-hash"] || "")
          .split(",")
          .map((part) => {
            const i = part.indexOf("=");
            return [part.slice(0, i).trim(), part.slice(i + 1)];
          }),
      );
      const mode =
        options.validation === undefined ? "crc32c" : options.validation;
      const crc =
        !range && mode !== false && mode !== "md5" && hashes.crc32c
          ? file.crc32cGenerator()
          : null;
      const md5 = !range && mode === "md5" ? createHash("md5") : null;
      if (md5 && !hashes.md5) {
        stream.destroy();
        throw Object.assign(Error(FileExceptionMessages.MD5_NOT_AVAILABLE), {
          code: "MD5_NOT_AVAILABLE",
        });
      }
      const transforms = [];
      if (crc || md5)
        transforms.push(
          new Transform({
            transform(chunk, encoding, callback) {
              try {
                crc?.update(chunk);
                md5?.update(chunk);
                callback(null, chunk);
              } catch (error) {
                callback(error);
              }
            },
            flush(callback) {
              try {
                const valid =
                  (!crc || crc.toString() === hashes.crc32c) &&
                  (!md5 || md5.digest("base64") === hashes.md5);
                callback(
                  valid
                    ? null
                    : Object.assign(
                        Error(FileExceptionMessages.DOWNLOAD_MISMATCH),
                        { code: "CONTENT_DOWNLOAD_MISMATCH" },
                      ),
                );
              } catch (error) {
                callback(error);
              }
            },
          }),
        );
      if (
        options.decompress !== false &&
        response.headers["content-encoding"] === "gzip"
      )
        transforms.push(createGunzip());
      pipeline(stream, ...transforms, output, (error) => {
        if (error && !output.destroyed) output.destroy(error);
      });
    } catch (error) {
      output.destroy(error);
    }
  }
  return output;
};
exports.download = async function download(file, options = {}) {
  const input = snapshot(options || {}),
    stream = exports.createReadStream(file, input);
  if (input.destination) {
    await pipe(stream, createWriteStream(input.destination));
    return [];
  }
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return [Buffer.concat(chunks)];
};
