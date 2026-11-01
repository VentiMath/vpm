"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  { EventEmitter, once } = require("node:events");
const current = require(".."),
  original = require("../../../scripts/storage-conformance/node_modules/@google-cloud/storage");
class Destination extends EventEmitter {
  constructor() {
    super();
    this.destroyed = false;
    this.error = null;
    this.on("error", (error) => (this.error = error));
  }
  setWritable(stream) {
    this.input = stream;
  }
  destroy(error) {
    if (this.destroyed) return;
    this.destroyed = true;
    this.input?.destroy(error);
    if (error) this.emit("error", error);
    this.emit("close");
  }
}
function fixture(API) {
  const file = new API.Storage({
    projectId: "fixture",
    apiEndpoint: "http://localhost:9999",
    useAuthWithCustomEndpoint: false,
  })
    .bucket("fixture")
    .file("file café.pdf");
  let request, callback;
  file.request = (req, cb) => {
    request = req;
    callback = cb;
  };
  return {
    file,
    get request() {
      return request;
    },
    reply(...args) {
      callback(...args);
    },
  };
}
test("multipart request plan preserves query precedence, content types and metadata", async () => {
  for (const API of [original, current]) {
    const f = fixture(API),
      dest = new Destination();
    f.file.generation = 2;
    f.file.kmsKeyName = "kms";
    f.file.userProject = "default";
    f.file.instancePreconditionOpts = {
      ifGenerationMatch: 3,
      ifMetagenerationMatch: 1,
    };
    const options = {
      metadata: {
        contentType: "application/pdf",
        metadata: { purpose: "before" },
      },
      timeout: 123,
      userProject: "billing",
      private: true,
      public: true,
      preconditionOpts: { ifGenerationMatch: 4 },
    };
    f.file.startSimpleUpload_(dest, options);
    options.metadata.metadata.purpose = "after";
    assert.equal(
      f.request.uri,
      "http://localhost:9999/upload/storage/v1/b/fixture/o",
    );
    assert.equal(f.request.method, "POST");
    assert.equal(f.request.timeout, 123);
    assert.equal(f.request.maxRetries, 0);
    assert.deepEqual(f.request.qs, {
      uploadType: "multipart",
      name: "file café.pdf",
      ifGenerationMatch: 4,
      kmsKeyName: "kms",
      userProject: "billing",
      predefinedAcl: "private",
      ifMetagenerationMatch: 1,
    });
    assert.equal(
      JSON.parse(f.request.multipart[0].body).metadata.purpose,
      "before",
    );
    assert.equal(f.request.multipart[1]["Content-Type"], "application/pdf");
    dest.destroy();
  }
});
test("progress counts binary payload only; successful metadata events keep their order", async () => {
  for (const API of [original, current]) {
    const f = fixture(API),
      dest = new Destination(),
      progress = [],
      events = [];
    dest.on("progress", (p) => progress.push(p.bytesWritten));
    for (const name of ["metadata", "response", "complete"])
      dest.on(name, () => events.push(name));
    f.file.startSimpleUpload_(dest, { metadata: {} });
    const chunks = [],
      body = f.request.multipart[1].body;
    body.on("data", (chunk) => chunks.push(chunk));
    const ended = once(body, "end");
    dest.input.write(Buffer.from([0, 255]));
    dest.input.end(Buffer.from([13, 10, 1]));
    await ended;
    f.reply(null, { name: "stored" }, { statusCode: 200 });
    assert.deepEqual(Buffer.concat(chunks), Buffer.from([0, 255, 13, 10, 1]));
    assert.deepEqual(progress, [2, 5]);
    assert.deepEqual(events, ["metadata", "response", "complete"]);
    assert.equal(f.file.metadata.name, "stored");
    dest.destroy();
  }
});
test("late and duplicate responses cannot change metadata or report success after cancellation", () => {
  for (const [API, fixed] of [
    [original, false],
    [current, true],
  ]) {
    const f = fixture(API),
      dest = new Destination();
    let events = 0;
    dest.on("metadata", () => events++);
    f.file.metadata = { name: "before" };
    f.file.startSimpleUpload_(dest);
    dest.destroy();
    f.reply(null, { name: "late" }, { statusCode: 200 });
    assert.equal(f.file.metadata.name, fixed ? "before" : "late");
    assert.equal(events, fixed ? 0 : 1);
    if (fixed) assert.equal(f.request.signal.aborted, true);
    const f2 = fixture(API),
      d2 = new Destination();
    f2.file.startSimpleUpload_(d2);
    f2.reply(null, { name: "first" }, {});
    f2.reply(null, { name: "duplicate" }, {});
    assert.equal(f2.file.metadata.name, fixed ? "first" : "duplicate");
    d2.destroy();
  }
});
test("serialization and dispatch errors settle the stream with the original error identity", () => {
  const f = fixture(current),
    dest = new Destination(),
    error = new Error("dispatch");
  f.file.request = () => {
    throw error;
  };
  f.file.startSimpleUpload_(dest);
  assert.equal(dest.error, error);
  const cyclic = {};
  cyclic.self = cyclic;
  const invalid = new Destination();
  f.file.startSimpleUpload_(invalid, { metadata: cyclic });
  assert.ok(invalid.error instanceof TypeError);
  const already = new Destination();
  already.destroy();
  let called = false;
  f.file.request = () => (called = true);
  f.file.startSimpleUpload_(already);
  assert.equal(called, false);
});
test("empty frozen options and errored transport preserve caller ownership", async () => {
  const f = fixture(current),
    dest = new Destination(),
    error = new Error("network");
  f.file.startSimpleUpload_(dest, Object.freeze({}));
  const body = f.request.multipart[1].body;
  body.resume();
  dest.input.end();
  f.reply(error);
  assert.equal(dest.error, error);
  assert.equal(f.request.signal.aborted, true);
  assert.equal(dest.listenerCount("close"), 0);
  assert.equal(dest.listenerCount("error"), 1);
});
