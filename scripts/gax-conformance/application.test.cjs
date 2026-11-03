"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  { PassThrough, Readable } = require("node:stream");
const api = require("../../packages/vgoogle-gax");
const settings = (overrides) =>
  new api.CallSettings({ timeout: 500, retry: null, ...overrides });
const collect = async (stream) => {
  const result = [];
  for await (const value of stream) result.push(value);
  return result;
};
const next = () => new Promise((r) => setImmediate(r));
test("public application entry loads no retained GAX runtime beyond its independent JSON cache", () => {
  const loaded = Object.keys(require.cache).filter(
    (p) =>
      p.includes("/vgoogle-gax/build/src/") &&
      !p.endsWith("/jsonProtoCache.js"),
  );
  assert.deepEqual(loaded, []);
});
test("settings merge preserves frozen defaults, retries and per-call headers/options", () => {
  const Original = require("google-gax").CallSettings;
  const control = new Original({
    retry: {
      retryCodes: [14],
      backoffSettings: Object.freeze({ totalTimeoutMillis: 900 }),
    },
  });
  assert.throws(() => control.merge({ timeout: 20 }), TypeError);
  const defaults = settings({
    retry: { retryCodes: [14], backoffSettings: { totalTimeoutMillis: 900 } },
    otherArgs: { options: { waitForReady: true }, headers: { a: "1" } },
  });
  Object.freeze(defaults.retry.backoffSettings);
  Object.freeze(defaults.retry);
  const one = defaults.merge({ timeout: 20 }),
    two = defaults.merge({ timeout: 40 });
  assert.equal(one.retry.backoffSettings.totalTimeoutMillis, 20);
  assert.equal(two.retry.backoffSettings.totalTimeoutMillis, 40);
  assert.equal(defaults.retry.backoffSettings.totalTimeoutMillis, 900);
  const override = defaults.merge({
    timeout: 20,
    retry: { backoffSettings: { totalTimeoutMillis: 50 } },
  });
  assert.equal(override.retry.backoffSettings.totalTimeoutMillis, 50);
  assert.equal(
    defaults.merge({}).retry.backoffSettings.totalTimeoutMillis,
    500,
  );
  one.otherArgs.options.waitForReady = false;
  assert.equal(defaults.otherArgs.options.waitForReady, true);
});
test("unary promises, callbacks, deadlines and late callbacks settle once", async () => {
  let seen;
  const call = api.createApiCall((request, metadata, options, cb) => {
    seen = options;
    cb(null, request);
    cb(Error("late"));
    return { cancel() {} };
  }, settings());
  assert.equal((await call({ id: 1 }))[0].id, 1);
  await new Promise((resolve, reject) =>
    call({ id: 2 }, {}, (error, value) => {
      try {
        assert.equal(error, null);
        assert.equal(value.id, 2);
        resolve();
      } catch (e) {
        reject(e);
      }
    }),
  );
  assert(seen.deadline instanceof Date);
  assert.equal(Object.hasOwn(call, "deadline"), false);
});
test("cancel before stub resolution rejects promptly without invoking transport", async () => {
  let resolve,
    invoked = 0;
  const source = new Promise((r) => (resolve = r)),
    p = api.createApiCall(source, settings())({});
  p.cancel();
  await assert.rejects(p, (e) => e.code === 1);
  resolve(() => invoked++);
  await next();
  assert.equal(invoked, 0);
});
test("unresolved stub times out and does not leave a call pending", async () => {
  const p = api.createApiCall(
    new Promise(() => {}),
    settings({ timeout: 10 }),
  )({});
  await assert.rejects(p, (e) => e.code === 4);
});
test("retryable unary error retries with independent deadline then succeeds", async () => {
  let calls = 0;
  const call = api.createApiCall(
    (req, m, o, cb) => {
      queueMicrotask(() =>
        ++calls === 1
          ? cb(Object.assign(Error("retry"), { code: 14 }))
          : cb(null, 42),
      );
      return { cancel() {} };
    },
    settings({
      retry: {
        retryCodes: [14],
        backoffSettings: {
          initialRetryDelayMillis: 0,
          totalTimeoutMillis: 500,
        },
      },
    }),
  );
  assert.equal((await call({}))[0], 42);
  assert.equal(calls, 2);
});
test("cancel during retry backoff prevents another attempt", async () => {
  let calls = 0;
  const call = api.createApiCall(
    (req, m, o, cb) => {
      calls++;
      queueMicrotask(() => cb(Object.assign(Error("retry"), { code: 14 })));
      return { cancel() {} };
    },
    settings({
      timeout: 30000,
      retry: {
        retryCodes: [14],
        backoffSettings: {
          initialRetryDelayMillis: 10000,
          totalTimeoutMillis: 30000,
        },
      },
    }),
  );
  const promise = call({});
  await next();
  promise.cancel();
  await assert.rejects(promise, (e) => e.code === 1);
  await next();
  assert.equal(calls, 1);
});
test("paging supports auto, manual, async iteration, limits and immutable requests", async () => {
  const descriptor = new api.PageDescriptor(
      "pageToken",
      "nextPageToken",
      "items",
    ),
    request = Object.freeze({ pageToken: "" });
  const call = api.createApiCall(
    (req, m, o, cb) => {
      queueMicrotask(() =>
        cb(null, {
          items: req.pageToken ? [3] : [1, 2],
          nextPageToken: req.pageToken ? "" : "next",
        }),
      );
      return { cancel() {} };
    },
    settings(),
    descriptor,
  );
  assert.deepEqual((await call(request))[0], [1, 2, 3]);
  assert.deepEqual((await call(request, { maxResults: 2 }))[0], [1, 2]);
  const [page, nextRequest] = await call(request, { autoPaginate: false });
  assert.deepEqual(page, [1, 2]);
  assert.equal(nextRequest.pageToken, "next");
  assert.deepEqual(
    await collect(descriptor.createStream(call, request)),
    [1, 2, 3],
  );
  assert.deepEqual(
    await collect(Readable.from(descriptor.asyncIterate(call, request))),
    [1, 2, 3],
  );
  assert.equal(request.pageToken, "");
});
test("paged stream destroy cancels an outstanding RPC", async () => {
  let cancellations = 0;
  const call = api.createApiCall(
    () => ({
      cancel() {
        cancellations++;
      },
    }),
    settings(),
  );
  const stream = new api.PageDescriptor("p", "next", "items").createStream(
    call,
    {},
  );
  stream.resume();
  await next();
  stream.destroy();
  await next();
  assert.equal(cancellations, 1);
});
test("bidirectional stream queues writes until stub is ready and preserves backpressure", async () => {
  let resolve;
  const ready = new Promise((r) => (resolve = r)),
    stream = api.createApiCall(
      ready,
      settings(),
      new api.StreamDescriptor(3),
    )();
  stream.write({ id: 1 });
  stream.end({ id: 2 });
  resolve(() => new PassThrough({ objectMode: true }));
  assert.deepEqual(await collect(stream), [{ id: 1 }, { id: 2 }]);
});
test("server stream waits for terminal status after readable end", async () => {
  const source = new PassThrough({ objectMode: true });
  source.getPeer = () => "fixture";
  const stream = api.createApiCall(
    () => source,
    settings(),
    new api.StreamDescriptor(1),
  )({});
  const result = collect(stream);
  await next();
  source.end({ id: 1 });
  setImmediate(() => source.emit("status", { code: 0 }));
  assert.deepEqual(await result, [{ id: 1 }]);
});
test("server stream retry before data, but no replay after delivered data", async () => {
  for (const sent of [false, true]) {
    let count = 0;
    const call = api.createApiCall(
      () => {
        const stream = new PassThrough({ objectMode: true });
        setImmediate(() => {
          count++;
          if (count === 1) {
            if (sent) stream.write(1);
            stream.destroy(Object.assign(Error("retry"), { code: 14 }));
          } else stream.end(2);
        });
        return stream;
      },
      settings({
        retry: {
          retryCodes: [14],
          backoffSettings: {
            initialRetryDelayMillis: 0,
            totalTimeoutMillis: 500,
          },
        },
      }),
      new api.StreamDescriptor(1),
    );
    if (sent) await assert.rejects(collect(call({})), (e) => e.code === 14);
    else assert.deepEqual(await collect(call({})), [2]);
    assert.equal(count, sent ? 1 : 2);
  }
});
test("stream can be cancelled before stub resolution", async () => {
  const stream = api.createApiCall(
    new Promise(() => {}),
    settings(),
    new api.StreamDescriptor(1),
  )({});
  const result = collect(stream);
  stream.cancel();
  await assert.rejects(result, (e) => e.code === 1);
});
test("JSON stream framing across every split, escapes, unicode, nested arrays and malformed endings", async () => {
  const {
      jsonArray,
    } = require("../../packages/vgoogle-gax/app-runtime/rest.cjs"),
    input = [{ s: 'é漢\\"', a: [1, { x: true }] }, { b: 2 }],
    buffer = Buffer.from(JSON.stringify(input));
  for (let i = 1; i < buffer.length; i++)
    assert.deepEqual(
      await collect(
        Readable.from(
          jsonArray(Readable.from([buffer.subarray(0, i), buffer.subarray(i)])),
        ),
      ),
      input,
    );
  for (const text of [
    '[{"x":1}',
    "[1,]",
    "[1]garbage",
    "[1 2]",
    "[{}{}]",
    "[\u00a0{}]",
    '{"x":1}',
  ])
    await assert.rejects(
      collect(Readable.from(jsonArray(Readable.from([Buffer.from(text)])))),
      SyntaxError,
    );
});
test("resource paths retain literal replacements, repeated bindings and strict separators", () => {
  const t = new api.PathTemplate("projects/{p}/documents/{d=**}");
  assert.equal(t.render({ p: "$&", d: "a/b" }), "projects/$&/documents/a/b");
  assert.deepEqual(t.match("projects/p/documents/a/b"), { p: "p", d: "a/b" });
  assert.throws(() => t.render({ p: "a/b", d: "c" }));
  assert.throws(() => new api.PathTemplate("{x}/{x}").match("a/b"));
});

test("throwing stream retry hooks reject the stream without escaping the event handler", async () => {
  for (const hook of ["shouldRetryFn", "getResumptionRequestFn"]) {
    const expected = new Error(hook);
    const call = api.createApiCall(
      () => {
        const source = new PassThrough({ objectMode: true });
        setImmediate(() =>
          source.destroy(Object.assign(new Error("retry"), { code: 14 })),
        );
        return source;
      },
      settings({
        retry: {
          retryCodes: [14],
          backoffSettings: { initialRetryDelayMillis: 0 },
          [hook]() {
            throw expected;
          },
        },
      }),
      new api.StreamDescriptor(1, false, true),
    );
    await assert.rejects(collect(call({})), (error) => error === expected);
  }
});
