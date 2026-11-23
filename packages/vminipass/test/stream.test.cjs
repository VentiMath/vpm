"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  { EventEmitter } = require("node:events");
const { Minipass, isStream, isReadable, isWritable } = require("../index.cjs");
test("object queue preserves values and scales to long traversals", () => {
  const s = new Minipass({ objectMode: true });
  const values = [
    null,
    undefined,
    false,
    0,
    ...Array.from({ length: 12000 }, (_, i) => ({ i })),
  ];
  for (const value of values) assert.equal(s.write(value), false);
  assert.equal(s.bufferLength, values.length);
  for (const value of values) assert.equal(s.read(), value);
  assert.equal(s.bufferLength, 0);
  s.end();
  assert(s.emittedEnd);
});
test("bytes, partial reads and split Unicode decoder", async () => {
  const s = new Minipass();
  s.write(new Uint8Array([1, 2, 3]).subarray(1));
  s.write(Buffer.from([4, 5]));
  assert.deepEqual(s.read(3), Buffer.from([2, 3, 4]));
  assert.equal(s.read(2), null);
  assert.deepEqual(s.read(), Buffer.from([5]));
  const text = new Minipass({ encoding: "utf8" }),
    p = text.concat();
  for (const byte of Buffer.from("a🦋é")) text.write(Uint8Array.of(byte));
  text.end();
  assert.equal(await p, "a🦋é");
  const raw = new Minipass({ encoding: "buffer" });
  raw.end("a");
  assert.deepEqual(await raw.concat(), Buffer.from("a"));
});
test("pipe respects false backpressure and removes subscription ownership", async () => {
  const source = new Minipass({ objectMode: true }),
    dest = new Minipass({ objectMode: true });
  source.pipe(dest);
  source.write(1);
  source.write(2);
  assert(source.paused);
  assert.equal(source.bufferLength, 1);
  const got = dest.collect();
  source.end(3);
  assert.deepEqual(Array.from(await got), [1, 2, 3]);
  assert.equal(source.pipes.length, 0);
  assert.equal(dest.listenerCount("drain"), 0);
});
test("reentrant unpipe does not skip another destination", () => {
  const s = new Minipass({ objectMode: true }),
    a = new EventEmitter(),
    b = new EventEmitter(),
    seen = [];
  a.write = (x) => {
    seen.push("a" + x);
    s.unpipe(a);
    return true;
  };
  b.write = (x) => {
    seen.push("b" + x);
    return true;
  };
  a.end = b.end = () => {};
  s.pipe(a);
  s.pipe(b);
  s.end(7);
  assert.deepEqual(seen, ["a7", "b7"]);
  assert.equal(b.listenerCount("drain"), 0);
});
test("end reentrancy is idempotent and late completion fires once", () => {
  const s = new Minipass();
  let n = 0;
  s.on("end", () => {
    n++;
    s.emit("end");
    s.end();
  });
  s.end();
  s.emit("end");
  assert.equal(n, 1);
  s.on("end", () => n++);
  assert.equal(n, 2);
  s.once("end", () => n++);
  assert.equal(n, 3);
  s.end(() => n++);
  assert.equal(n, 4);
  assert.equal(s.listenerCount("end"), 0);
});
test("abort rejects pending consumers and cleans subscriptions", async () => {
  const controller = new AbortController(),
    s = new Minipass({ objectMode: true, signal: controller.signal });
  const pending = s.collect(),
    error = new Error("cancel");
  controller.abort(error);
  await assert.rejects(pending, (e) => e === error);
  assert(s.destroyed);
  assert(s.aborted);
  assert.equal(s.write(1), false);
  assert.equal(s.listenerCount("data"), 0);
  assert.equal(s.listenerCount("error"), 0);
});
test("iterator return resolves a pending next and removes listeners", async () => {
  const s = new Minipass({ objectMode: true }),
    it = s[Symbol.asyncIterator](),
    next = it.next();
  await it.return();
  assert.deepEqual(await next, { done: true, value: undefined });
  assert.equal(s.listenerCount("readable"), 0);
  assert.equal(s.listenerCount("error"), 0);
  assert.equal(s.eventNames().length, 0);
});
test("async object iteration includes null and undefined", async () => {
  const s = new Minipass({ objectMode: true });
  s.write(null);
  s.write(undefined);
  s.end(4);
  const out = [];
  for await (const v of s) out.push(v);
  assert.deepEqual(out, [null, undefined, 4]);
});
test("async mode defers consumers and cannot be disabled", async () => {
  const s = new Minipass({ async: true }),
    got = [];
  s.on("data", (b) => got.push(b.toString()));
  const done = s.promise();
  s.end("abc");
  assert.deepEqual(got, []);
  s.async = false;
  assert(s.async);
  await done;
  assert.deepEqual(got, ["abc"]);
});
test("Node stream detection and dual module identities", async () => {
  const { Readable, Writable } = require("node:stream");
  assert(isStream(new Minipass()));
  assert(isReadable(new Readable({ read() {} })));
  assert(
    !isReadable(
      new Writable({
        write(c, e, cb) {
          cb();
        },
      }),
    ),
  );
  assert(isWritable(new Minipass()));
  assert(!isStream({}));
  const esm = await import("../index.mjs");
  assert.equal(esm.Minipass, Minipass);
  assert.equal(Minipass.isStream, isStream);
});
