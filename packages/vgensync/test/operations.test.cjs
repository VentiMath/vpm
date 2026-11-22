"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const owned = require("..");
const control = require("node:module").createRequire(
  require.resolve("../../../scripts/source-map-conformance/package.json"),
)("gensync");
test("the two implementations can drive each other's operations, including receivers and recovery", async () => {
  for (const driver of [control, owned])
    for (const leaf of [control, owned]) {
      const receiver = { base: 8 };
      const add = leaf({
        sync(x) {
          return this.base + x;
        },
        async: async function (x) {
          return this.base + x + 1;
        },
      });
      const err = new Error("partial");
      const fail = leaf({
        sync() {
          throw err;
        },
        errback(cb) {
          queueMicrotask(() => cb(err));
        },
      });
      const op = driver(function* (x) {
        const n = yield* add.call(this, x);
        try {
          yield* fail();
        } catch (e) {
          assert.equal(e, err);
          return n;
        }
      });
      assert.equal(op.sync.call(receiver, 5), 13);
      assert.equal(await op.async.call(receiver, 5), 14);
      await new Promise((ok, fail) =>
        op.errback.call(receiver, 5, (e, v) => {
          try {
            assert.equal(e, undefined);
            assert.equal(v, 14);
            ok();
          } catch (err) {
            fail(err);
          }
        }),
      );
    }
});
test("all starts siblings together, retains order, and race settles once", async () => {
  for (const g of [control, owned]) {
    const pending = [],
      started = [];
    const request = g({
      sync(x) {
        started.push(x);
        return x;
      },
      errback(x, cb) {
        started.push(x);
        pending.push(cb);
      },
    });
    const batch = g(function* (combine) {
      return yield* combine(new Set([request(1), request(2)]));
    });
    assert.deepEqual(batch.sync(g.all), [1, 2]);
    started.length = 0;
    assert.equal(batch.sync(g.race), 1);
    assert.deepEqual(started, [1]);
    started.length = 0;
    let result = batch.async(g.all);
    assert.deepEqual(started, [1, 2]);
    pending[1](null, "b");
    pending[0](null, "a");
    assert.deepEqual(await result, ["a", "b"]);
    pending.length = 0;
    result = batch.async(g.race);
    pending[1](null, "winner");
    pending[0](new Error("late"));
    assert.equal(await result, "winner");
    const empty = g(function* (fn) {
      return yield* fn([]);
    });
    assert.throws(() => empty.sync(g.race), { code: "GENSYNC_RACE_NONEMPTY" });
    await assert.rejects(empty.async(g.race), {
      code: "GENSYNC_RACE_NONEMPTY",
    });
    let sync = true;
    const promise = new Promise((ok, fail) =>
      empty.errback(g.all, (e, v) => {
        try {
          assert.equal(sync, false);
          assert.deepEqual(v, []);
          ok();
        } catch (err) {
          fail(err);
        }
      }),
    );
    sync = false;
    await promise;
  }
});
test("immediate errbacks use a loop and duplicate notifications retain the first result", async () => {
  const leaf = owned({
    sync: (n) => n,
    errback(n, cb) {
      cb(null, n);
      cb(new Error("late"));
      throw new Error("after settlement");
    },
  });
  const sum = owned(function* (limit) {
    let total = 0;
    for (let i = 0; i < limit; i++) total += yield* leaf(i);
    return total;
  });
  let settled = false;
  sum.errback(20000, (e, v) => {
    assert.equal(e, undefined);
    assert.equal(v, 199990000);
    settled = true;
  });
  assert.ok(settled);
  assert.equal(await sum.async(5), 10);
});
test("protocol violations clean up suspended generators", async () => {
  for (const g of [control, owned]) {
    let exited = 0;
    const invalid = g(function* () {
      try {
        yield 42;
      } finally {
        exited++;
      }
    });
    assert.throws(() => invalid.sync(), { code: "GENSYNC_EXPECTED_START" });
    await assert.rejects(invalid.async(), { code: "GENSYNC_EXPECTED_START" });
    assert.equal(exited, 2);
  }
  assert.equal((await import("vgensync")).default, owned);
});
