"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  { Writable, finished } = require("node:stream"),
  { createHash } = require("node:crypto"),
  { gunzipSync } = require("node:zlib");
const current = require(".."),
  original = require("../../../scripts/storage-conformance/node_modules/@google-cloud/storage");
const pause = () => new Promise((resolve) => setImmediate(resolve));
function file(API) {
  return new API.Storage({ projectId: "fixture" })
    .bucket("fixture")
    .file("report.txt");
}
function done(stream) {
  return new Promise((resolve, reject) =>
    finished(stream, { readable: false }, (error) =>
      error ? reject(error) : resolve(),
    ),
  );
}
function transport(file, API, configure = {}) {
  let calls = 0,
    bytes,
    options,
    destination;
  file.startSimpleUpload_ = file.startResumableUpload_ = (dest, opts) => {
    calls++;
    options = opts;
    destination = dest;
    const chunks = [];
    const sink = new Writable({
      autoDestroy: false,
      write(chunk, encoding, cb) {
        chunks.push(Buffer.from(chunk));
        cb();
      },
      final(cb) {
        bytes = Buffer.concat(chunks);
        const crc = new API.CRC32C();
        crc.update(bytes);
        file.metadata = {
          crc32c: crc.toString(),
          md5Hash: createHash("md5").update(bytes).digest("base64"),
        };
        if (configure.corrupt) file.metadata.crc32c = "AAAAAA==";
        if (!configure.noMetadata) dest.emit("metadata", file.metadata);
        cb();
        if (configure.close) queueMicrotask(() => dest.emit("close"));
      },
    });
    dest.setWritable(sink);
  };
  return {
    get calls() {
      return calls;
    },
    get bytes() {
      return bytes;
    },
    get options() {
      return options;
    },
    get destination() {
      return destination;
    },
  };
}
test("frozen options are accepted without mutation (original failure reproduced)", () => {
  for (const [API, vpm] of [
    [original, false],
    [current, true],
  ]) {
    const f = file(API),
      options = Object.freeze({
        resumable: false,
        contentType: "text/plain",
        metadata: Object.freeze({}),
      });
    if (!vpm) assert.throws(() => f.createWriteStream(options), TypeError);
    else {
      const stream = f.createWriteStream(options);
      stream.destroy();
      assert.deepEqual(options.metadata, {});
    }
  }
});
test("cancellation during MIME lookup never starts an upload (original failure reproduced)", async () => {
  for (const [API, vpm] of [
    [original, false],
    [current, true],
  ]) {
    const f = file(API),
      capture = transport(f, API),
      stream = f.createWriteStream({ resumable: false });
    stream.on("error", () => {});
    stream.end("data");
    stream.destroy();
    await pause();
    await pause();
    assert.equal(capture.calls, vpm ? 0 : 1);
  }
});
test("closed transport without metadata rejects instead of leaving finish pending", async () => {
  for (const [API, vpm] of [
    [original, false],
    [current, true],
  ]) {
    const f = file(API);
    transport(f, API, { noMetadata: true, close: true });
    const stream = f.createWriteStream({
      contentType: "text/plain",
      validation: false,
    });
    let error,
      settled = false;
    const result = done(stream).then(
      () => {
        settled = true;
      },
      (e) => {
        error = e;
        settled = true;
      },
    );
    stream.end("payload");
    await pause();
    await pause();
    assert.equal(settled, vpm);
    if (vpm) assert.equal(error.code, "ERR_STREAM_PREMATURE_CLOSE");
    stream.destroy();
    await result;
  }
});
test("late response metadata gates completion, with no waiting listeners after cancel", async () => {
  const f = file(current),
    capture = transport(f, current, { noMetadata: true }),
    stream = f.createWriteStream({ contentType: "text/plain" });
  let finished = false;
  const result = done(stream).then(() => (finished = true));
  stream.end("late");
  await pause();
  assert.equal(finished, false);
  capture.destination.emit("metadata", f.metadata);
  await result;
  assert.equal(finished, true);
  const stopped = f.createWriteStream({
    contentType: "text/plain",
    validation: false,
  });
  const caught = done(stopped).catch((e) => e);
  stopped.end("cancel");
  await pause();
  stopped.destroy();
  assert.equal((await caught).code, "ERR_STREAM_PREMATURE_CLOSE");
  assert.equal(capture.destination.listenerCount("metadata"), 0);
});
test("ordinary compression, auto MIME, checksums and partial/resumed uploads match original", async () => {
  for (const API of [original, current])
    for (const opts of [
      {},
      { gzip: true },
      { gzip: "auto" },
      { validation: "MD5" },
      { validation: false },
      { isPartialUpload: true, offset: 1 },
      { offset: 1, resumeCRC32C: "AAAAAA==", isPartialUpload: true },
    ]) {
      const f = file(API),
        capture = transport(f, API),
        stream = f.createWriteStream(opts),
        result = done(stream);
      let checks = 0;
      stream.on("crc32c", () => checks++);
      stream.end("hello world");
      await result;
      assert.equal(capture.options.metadata.contentType, "text/plain");
      assert.equal(
        (opts.gzip ? gunzipSync(capture.bytes) : capture.bytes).toString(),
        "hello world",
      );
      assert.equal(
        checks,
        (typeof opts.validation === "string" &&
          opts.validation.toLowerCase() === "md5") ||
          opts.validation === false
          ? 0
          : 1,
      );
    }
});
test("corrupt upload cleanup preserves deletion failure codes and causes", async () => {
  for (const API of [original, current])
    for (const deleteFails of [false, true]) {
      const f = file(API);
      let deletes = 0;
      const error = new Error("denied");
      f.delete = async () => {
        deletes++;
        if (deleteFails) throw error;
      };
      transport(f, API, { corrupt: true });
      const stream = f.createWriteStream({ contentType: "text/plain" }),
        result = done(stream);
      stream.end("invalid");
      await assert.rejects(result, (e) => {
        assert.equal(
          e.code,
          deleteFails ? "FILE_NO_UPLOAD_DELETE" : "FILE_NO_UPLOAD",
        );
        assert.deepEqual(e.errors, deleteFails ? [error] : []);
        return true;
      });
      assert.equal(deletes, 1);
    }
});
test("metadata/options and retry policy belong to a direct stream; sync failures settle", async () => {
  const f = file(current),
    capture = transport(f, current),
    options = {
      contentType: "text/plain",
      metadata: { metadata: { note: "before" } },
    };
  const stream = f.createWriteStream(options);
  options.metadata.metadata.note = "after";
  const result = done(stream);
  stream.end("data");
  await result;
  assert.equal(capture.options.metadata.metadata.note, "before");
  assert.equal(f.storage.retryOptions.autoRetry, true);
  const expected = new Error("setup failed");
  f.startResumableUpload_ = () => {
    throw expected;
  };
  const failing = f.createWriteStream({ contentType: "text/plain" }),
    caught = done(failing);
  failing.end("x");
  await assert.rejects(caught, (e) => e === expected);
  assert.throws(
    () => f.createWriteStream({ offset: 1, validation: "md5" }),
    RangeError,
  );
  assert.throws(() => f.createWriteStream({ offset: 1 }), RangeError);
});

test("slow transport preserves byte order, backpressure and empty uploads", async () => {
  const { Readable } = require("node:stream");
  const pump = require("node:stream/promises").pipeline;
  for (const API of [original, current]) {
    const f = file(API),
      data = Buffer.alloc(128 * 1024, 42);
    let bytes = 0,
      writes = 0;
    f.startSimpleUpload_ = (dest) =>
      dest.setWritable(
        new Writable({
          highWaterMark: 1024,
          write(chunk, encoding, callback) {
            assert.deepEqual(chunk, data);
            bytes += chunk.length;
            writes++;
            setImmediate(callback);
          },
          final(callback) {
            dest.emit("metadata", {});
            callback();
          },
        }),
      );
    const stream = f.createWriteStream({
      resumable: false,
      validation: false,
      contentType: "application/octet-stream",
    });
    let drains = 0;
    stream.on("drain", () => drains++);
    await pump(Readable.from(Array.from({ length: 16 }, () => data)), stream);
    assert.equal(bytes, data.length * 16);
    assert.equal(writes, 16);
    assert.ok(drains > 0);
    const empty = f.createWriteStream({
      resumable: false,
      validation: false,
      contentType: "application/octet-stream",
    });
    const finished = done(empty);
    empty.end();
    await finished;
    assert.equal(writes, 16);
  }
});
