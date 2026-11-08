"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  api = require("..");
const { createAtom, createAsyncAtom, createStore, batch } = api;
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
test("current public behavior and seeded dependency graphs", () => {
  const fixture = require("../../../scripts/store-conformance/cases.cjs");
  fixture.compare(
    api,
    require("../../../scripts/store-conformance/node_modules/@tanstack/store"),
  );
});
test("detached graphs stay lazy, drop old branches and reconnect", () => {
  const flag = createAtom(true),
    a = createAtom(1),
    b = createAtom(2);
  let calls = 0;
  const derived = createAtom(() => {
    calls++;
    return flag.get() ? a.get() : b.get();
  });
  const values = [];
  const sub = derived.subscribe((x) => values.push(x));
  a.set(3);
  flag.set(false);
  a.set(4);
  assert.equal(calls, 3);
  sub.unsubscribe();
  sub.unsubscribe();
  b.set(7);
  assert.equal(calls, 3);
  assert.equal(derived.get(), 7);
  const again = derived.subscribe((x) => values.push(x));
  b.set(9);
  again.unsubscribe();
  assert.deepEqual(values, [3, 2, 9]);
});
test("diamond listeners see complete inputs after nested batches", () => {
  const a = createAtom(1),
    b = createAtom(() => a.get() * 2),
    c = createAtom(() => a.get() + 3),
    d = createAtom(() => b.get() + c.get()),
    values = [];
  d.subscribe((v) => values.push([v, b.get(), c.get()]));
  batch(() => {
    a.set(2);
    batch(() => a.set(3));
  });
  assert.deepEqual(values, [[12, 6, 6]]);
});
test("listener writes are delivered in complete successive waves", () => {
  const a = createAtom(0),
    values = [];
  a.subscribe((v) => {
    values.push("a" + v);
    if (v === 1) a.set(2);
  });
  a.subscribe((v) => values.push("b" + v));
  a.set(1);
  assert.deepEqual(values, ["a1", "b1", "a2", "b2"]);
});
test("one observer failure cannot strand the other subscribers or later writes", () => {
  const a = createAtom(0),
    bad = Error("observer"),
    values = [];
  const sub = a.subscribe(() => {
    throw bad;
  });
  a.subscribe((v) => values.push(v));
  assert.throws(
    () => a.set(1),
    (e) => e === bad,
  );
  assert.throws(
    () => a.set(2),
    (e) => e === bad,
  );
  sub.unsubscribe();
  a.set(3);
  assert.deepEqual(values, [1, 2, 3]);
});
test("computed errors reach error observers and recover when inputs change", () => {
  const a = createAtom(1),
    bad = Error("compute"),
    events = [];
  const b = createAtom(() => {
    if (a.get() === 2) throw bad;
    return a.get() * 2;
  });
  b.subscribe({
    next: (v) => events.push(v),
    error: (e) => events.push(e.message),
  });
  a.set(2);
  assert.throws(
    () => b.get(),
    (e) => e === bad,
  );
  a.set(3);
  assert.deepEqual(events, ["compute", 6]);
  assert.equal(b.get(), 6);
});
test("an unhandled computation error throws without poisoning the scheduler", () => {
  const a = createAtom(0),
    b = createAtom(() => {
      if (a.get() === 1) throw Error("bad");
      return a.get();
    });
  const seen = [];
  b.subscribe((v) => seen.push(v));
  assert.throws(() => a.set(1), /bad/);
  a.set(2);
  assert.deepEqual(seen, [2]);
});
test("a failed batch flushes valid writes then rethrows the original error", () => {
  const a = createAtom(0),
    values = [],
    bad = Error("body");
  a.subscribe((v) => values.push(v));
  assert.throws(
    () =>
      batch(() => {
        a.set(3);
        throw bad;
      }),
    (e) => e === bad,
  );
  a.set(4);
  assert.deepEqual(values, [3, 4]);
});
test("cycles are diagnosed and a changed branch can recover", () => {
  const flag = createAtom(false);
  let b;
  const a = createAtom(() => (flag.get() ? b.get() : 1));
  b = createAtom(() => a.get() + 1);
  assert.equal(b.get(), 2);
  flag.set(true);
  assert.throws(() => a.get(), /Circular atom dependency/);
  flag.set(false);
  assert.equal(a.get(), 1);
});
test("async atoms ignore stale completions, deliver errors, and recover", async () => {
  const key = createAtom(1),
    pending = new Map(),
    events = [];
  const a = createAsyncAtom(() => {
    const k = key.get();
    return new Promise((resolve, reject) =>
      pending.set(k, { resolve, reject }),
    );
  });
  assert.deepEqual(a.get(), { status: "pending" });
  const sub = a.subscribe((v) => events.push(v.status));
  key.set(2);
  pending.get(2).resolve("two");
  await tick();
  pending.get(1).resolve("one");
  await tick();
  assert.deepEqual(a.get(), { status: "done", data: "two" });
  key.set(3);
  const bad = Error("async");
  pending.get(3).reject(bad);
  await tick();
  assert.equal(a.get().error, bad);
  key.set(4);
  pending.get(4).resolve("four");
  await tick();
  assert.equal(a.get().data, "four");
  sub.unsubscribe();
  assert.deepEqual(events, [
    "pending",
    "done",
    "pending",
    "error",
    "pending",
    "done",
  ]);
});
test("stores keep bound methods and typed action results", () => {
  const s = createStore(1, ({ setState, get }) => ({
    add(n) {
      setState((x) => x + n);
      return get();
    },
  }));
  const { get, setState } = s;
  setState((x) => x + 1);
  assert.equal(s.actions.add(3), 5);
  assert.equal(get(), 5);
});
