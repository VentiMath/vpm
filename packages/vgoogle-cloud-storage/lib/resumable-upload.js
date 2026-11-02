"use strict";
const { Writable } = require("node:stream");
const { snapshot, uploadPolicy } = require("./save.js");
const { retryable } = require("./transport.js");
const MIN_CHUNK = 256 * 1024;
function request(file, options) {
  return new Promise((resolve, reject) =>
    file.request(options, (error, body, response) =>
      error ? reject(error) : resolve([body, response]),
    ),
  );
}
function plan(file, supplied) {
  const options = snapshot(supplied),
    metadata = { ...options.metadata, name: file.name },
    query = {
      uploadType: "resumable",
      name: file.name,
      ...file.instancePreconditionOpts,
      ...options.preconditionOpts,
    };
  if (
    file.generation !== undefined &&
    !Object.hasOwn(query, "ifGenerationMatch")
  )
    query.ifGenerationMatch = file.generation;
  if (options.userProject || file.userProject)
    query.userProject = options.userProject || file.userProject;
  if (file.kmsKeyName) query.kmsKeyName = file.kmsKeyName;
  const acl =
    options.predefinedAcl ||
    (options.private ? "private" : options.public ? "publicRead" : undefined);
  if (acl) query.predefinedAcl = acl;
  return {
    options,
    metadata,
    query,
    uri: `${file.storage.apiEndpoint}/upload/storage/v1/b/${encodeURIComponent(file.bucket.name)}/o`,
  };
}
function sessionURL(value, endpoint) {
  const url = new URL(value, endpoint);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    url.origin !== new URL(endpoint).origin
  )
    throw TypeError("Invalid resumable session URL");
  return url.href;
}
exports.createURI = async function createURI(file, supplied = {}) {
  const p = plan(file, supplied);
  const [, response] = await request(file, {
    uri: p.uri,
    method: "POST",
    qs: p.query,
    json: p.metadata,
    headers: {
      "x-upload-content-type":
        p.metadata.contentType || "application/octet-stream",
    },
    resumableResponse: true,
    maxRetries: 0,
    signal: p.options.signal,
    timeout: p.options.timeout,
  });
  const location = response.headers.location;
  if (!location) throw Error("Storage did not return a resumable session URL");
  return sessionURL(location, p.uri);
};
exports.start = function start(file, destination, supplied = {}) {
  const p = plan(file, supplied),
    options = p.options,
    controller = new AbortController();
  const policy = { ...(supplied[uploadPolicy] || file.storage.retryOptions) };
  const size = options.chunkSize ?? 8 * 1024 * 1024;
  if (!Number.isSafeInteger(size) || size < MIN_CHUNK || size % MIN_CHUNK) {
    destination.destroy(
      new RangeError("chunkSize must be a positive multiple of 256 KiB"),
    );
    return;
  }
  if (
    options.offset !== undefined &&
    (!Number.isSafeInteger(options.offset) || options.offset < 0)
  ) {
    destination.destroy(
      new RangeError("offset must be a nonnegative safe integer"),
    );
    return;
  }
  if (options.offset && !options.uri) {
    destination.destroy(
      new TypeError("A continued upload requires its session URI"),
    );
    return;
  }
  let offset = options.offset || 0,
    uri = options.uri ? sessionURL(options.uri, p.uri) : undefined,
    segments = [],
    length = 0,
    complete = false,
    session;
  const signal = controller.signal,
    started = Date.now();
  const cancel = () => controller.abort(destination.errored || null);
  destination.once("close", cancel);
  function check() {
    if (Date.now() - started > policy.totalTimeout * 1000)
      throw Object.assign(new Error("Resumable upload timed out"), {
        code: "ETIMEDOUT",
      });
    if (signal.aborted)
      throw signal.reason instanceof Error
        ? signal.reason
        : Object.assign(new Error("Upload cancelled"), { code: "ABORT_ERR" });
  }
  async function ready() {
    if (uri) return uri;
    return (session ||= exports
      .createURI(file, { ...options, signal })
      .then((value) => {
        check();
        uri = value;
        destination.emit("uri", uri);
        return uri;
      }));
  }
  function acknowledge(response, start, end) {
    const range = response.headers.range;
    let value = 0;
    if (range !== undefined) {
      const match = /^bytes=0-(\d+)$/.exec(range);
      if (!match) throw Error("Invalid resumable acknowledgement");
      value = Number(match[1]) + 1;
    }
    if (!Number.isSafeInteger(value) || value < start || value > end)
      throw Error("Resumable acknowledgement is outside the sent byte range");
    return value;
  }
  function finish(body, response) {
    check();
    if (!body || typeof body !== "object")
      throw Error("Missing resumable response metadata");
    file.metadata = body;
    complete = true;
    destination.emit("metadata", body);
    destination.emit("response", response);
  }
  async function send(data, final) {
    check();
    await ready();
    check();
    const start = offset,
      end = start + data.length,
      total = final && !options.isPartialUpload ? end : "*";
    let cursor = start,
      attempt = 0;
    while (true) {
      check();
      let result;
      try {
        const body = data.subarray(cursor - start);
        const range = body.length
          ? `bytes ${cursor}-${end - 1}/${total}`
          : `bytes */${total}`;
        result = await request(file, {
          uri,
          method: "PUT",
          body,
          headers: {
            "content-type":
              p.metadata.contentType || "application/octet-stream",
            "content-range": range,
            "content-length": String(body.length),
          },
          acceptedStatuses: [308],
          resumableResponse: true,
          maxRetries: 0,
          signal,
          timeout: options.timeout,
        });
      } catch (error) {
        if (
          !policy.autoRetry ||
          attempt++ >= policy.maxRetries ||
          !(policy.retryableErrorFn || retryable)(error)
        )
          throw error;
        check();
        // Ask the session what was persisted before replaying any buffered bytes.
        result = await request(file, {
          uri,
          method: "PUT",
          body: Buffer.alloc(0),
          headers: { "content-range": "bytes */*", "content-length": "0" },
          acceptedStatuses: [308],
          resumableResponse: true,
          maxRetries: 0,
          signal,
          timeout: options.timeout,
        });
      }
      const [body, response] = result;
      check();
      if (response.statusCode !== 308) {
        if (!final || options.isPartialUpload)
          throw Error("Storage completed an upload before its final chunk");
        offset = end;
        finish(body, response);
        destination.emit("progress", {
          bytesWritten: offset,
          contentLength: total,
        });
        return;
      }
      const acknowledged = acknowledge(response, start, end);
      offset = acknowledged;
      destination.emit("progress", {
        bytesWritten: offset,
        contentLength: total,
      });
      if (acknowledged === end) {
        if (final && !options.isPartialUpload)
          throw Error(
            "Final upload was acknowledged without response metadata",
          );
        return;
      }
      if (acknowledged <= cursor && attempt++ >= policy.maxRetries)
        throw Error("Resumable upload made no progress");
      cursor = acknowledged;
    }
  }
  function take(count) {
    const result = Buffer.allocUnsafe(count);
    let used = 0;
    while (used < count) {
      const part = segments[0],
        n = Math.min(part.length, count - used);
      part.copy(result, used, 0, n);
      used += n;
      if (n === part.length) segments.shift();
      else segments[0] = part.subarray(n);
    }
    length -= count;
    return result;
  }
  const stream = new Writable({
    highWaterMark: options.highWaterMark,
    write(chunk, encoding, callback) {
      segments.push(Buffer.from(chunk));
      length += chunk.length;
      (async () => {
        while (length > size) await send(take(size), false);
      })().then(() => callback(), callback);
    },
    final(callback) {
      send(take(length), true)
        .then(() => {
          if (!complete && !options.isPartialUpload)
            throw Error("Upload finished without metadata");
          destination.emit("complete");
        })
        .then(() => callback(), callback);
    },
    destroy(error, callback) {
      controller.abort(error || null);
      segments = [];
      length = 0;
      destination.removeListener("close", cancel);
      callback(error);
    },
  });
  stream.on("error", (error) => destination.destroy(error));
  destination.setWritable(stream);
};
