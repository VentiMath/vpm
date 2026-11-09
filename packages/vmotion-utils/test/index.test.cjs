"use strict";
const assert = require("node:assert/strict"),
  { test } = require("node:test");
const api = require(process.env.VMOTION_UTILS_ENTRY || "../index.cjs");
const near = (a, b, tolerance = 1e-10) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
test("self-removal does not skip another subscriber", () => {
  const manager = new api.SubscriptionManager(),
    seen = [];
  let off;
  off = manager.add(() => {
    seen.push("a");
    off();
  });
  manager.add(() => seen.push("b"));
  manager.notify();
  manager.notify();
  assert.deepEqual(seen, ["a", "b", "b"]);
});
test("removal, deferred addition and duplicate registration", () => {
  const m = new api.SubscriptionManager(),
    seen = [];
  const b = () => seen.push("b"),
    c = () => seen.push("c");
  m.add(() => {
    seen.push("a");
    m.remove(b);
    m.add(c);
  });
  m.add(b);
  m.add(b);
  assert.equal(m.getSize(), 2);
  m.notify();
  assert.deepEqual(seen, ["a"]);
  m.notify();
  assert.deepEqual(seen, ["a", "a", "c"]);
});
test("clear ends the current notification and stale disposers are harmless", () => {
  const m = new api.SubscriptionManager(),
    seen = [];
  const fn = () => seen.push("new"),
    old = m.add(fn);
  m.clear();
  m.add(fn);
  old();
  m.notify();
  assert.deepEqual(seen, ["new"]);
  m.clear();
  m.add(() => {
    seen.push("clear");
    m.clear();
    m.add(fn);
  });
  m.add(() => seen.push("removed"));
  m.notify();
  assert.deepEqual(seen, ["new", "clear"]);
  m.notify();
  assert.deepEqual(seen, ["new", "clear", "new"]);
});
test("remove then re-add uses a new registration identity", () => {
  const m = new api.SubscriptionManager();
  let calls = 0;
  const f = () => calls++;
  const old = m.add(f);
  m.remove(f);
  m.add(f);
  old();
  m.notify();
  assert.equal(calls, 1);
});
test("nested notification and exception propagation", () => {
  const m = new api.SubscriptionManager(),
    seen = [];
  let nested = false;
  m.add(() => {
    seen.push("a");
    if (!nested) {
      nested = true;
      m.notify();
    }
  });
  m.add(() => seen.push("b"));
  m.notify();
  assert.deepEqual(seen, ["a", "a", "b", "b"]);
  m.clear();
  const error = new Error("listener");
  m.add(() => {
    throw error;
  });
  assert.throws(
    () => m.notify(),
    (e) => e === error,
  );
  m.clear();
  assert.equal(m.getSize(), 0);
});
test("scalar helper boundaries and signed zero", () => {
  assert.equal(api.clamp(0, 1, -1), 0);
  assert.equal(api.clamp(0, 1, 2), 1);
  assert.equal(api.progress(4, 4, 100), 1);
  assert.equal(api.wrap(0, 360, -10), 350);
  assert.equal(api.wrap(0, 360, 360), 0);
  assert.equal(api.velocityPerSecond(2, 0), 0);
  assert.equal(api.velocityPerSecond(2, 20), 100);
  assert.equal(api.millisecondsToSeconds(api.secondsToMilliseconds(0.3)), 0.3);
  assert.ok(Object.is(api.clamp(0, 1, -0), -0));
});
test("Bezier inversion follows analytical quadratic and cube-root curves", () => {
  const square = api.cubicBezier(1 / 3, 0, 2 / 3, 1 / 3),
    cubeRoot = api.cubicBezier(0, 1 / 3, 0, 2 / 3);
  for (const x of [
    1e-15, 1e-12, 1e-9, 0.0001, 0.01, 0.25, 0.5, 0.75, 0.99, 1,
  ]) {
    near(square(x), x * x);
    near(cubeRoot(x), Math.cbrt(x));
  }
});
test("easing endpoints, symmetry and overshoot", () => {
  for (const name of [
    "easeIn",
    "easeOut",
    "easeInOut",
    "circIn",
    "circOut",
    "circInOut",
    "backIn",
    "backOut",
    "backInOut",
    "anticipate",
  ]) {
    near(api[name](0), 0);
    near(api[name](1), 1);
  }
  assert.ok(api.backOut(0.5) > 1);
  near(api.easeIn(0.25), 1 - api.easeOut(0.75));
  near(api.mirrorEasing((x) => x * x)(0.25), 0.125);
  assert.equal(api.cubicBezier(0, 0, 1, 1)(0.4), 0.4);
});
test("invalid curves and step configuration reject", () => {
  for (const args of [
    [-1, 0, 1, 1],
    [0, 0, 2, 1],
    [0, NaN, 1, 1],
    [0, 0, 1, Infinity],
  ])
    assert.throws(() => api.cubicBezier(...args), TypeError);
  for (const n of [0, -1, 1.5, NaN, Infinity])
    assert.throws(() => api.steps(n), TypeError);
  assert.throws(() => api.steps(4, "middle"), TypeError);
  assert.throws(
    () => api.easingDefinitionToFunction("constructor"),
    /Unknown easing/,
  );
  assert.throws(() => api.easingDefinitionToFunction([0, 1]), TypeError);
});
test("step boundaries follow the targeted Motion contract", () => {
  assert.equal(api.steps(4)(0.25), 0.25);
  assert.equal(api.steps(4)(1), 0.75);
  assert.equal(api.steps(4, "start")(0), 0.25);
  assert.equal(api.steps(4, "start")(0.25), 0.25);
  assert.equal(api.steps(4, "start")(1), 1);
});
test("arrays remain immutable on move, unique operations preserve identity", () => {
  const array = [1, 2, 3];
  assert.deepEqual(api.moveItem(array, -1, 0), [3, 1, 2]);
  assert.deepEqual(api.moveItem(array, 0, -1), [2, 3, 1]);
  assert.deepEqual(array, [1, 2, 3]);
  const obj = {};
  const a = [obj];
  api.addUniqueItem(a, obj);
  assert.equal(a.length, 1);
  api.removeItem(a, obj);
  assert.deepEqual(a, []);
});
test("numeric and zero-unit syntax is bounded", () => {
  for (const s of ["-1", ".5", "12.25", "0"])
    assert.equal(api.isNumericalString(s), true);
  for (const s of ["1e3", "1.", " 1", "1\n", ""])
    assert.equal(api.isNumericalString(s), false);
  assert.equal(api.isZeroValueString("0px"), true);
  assert.equal(api.isZeroValueString("0.0px"), false);
  assert.equal(api.isObject(null), false);
  assert.equal(api.isObject([]), true);
});
test("memo caches undefined and retries a thrown initialization", () => {
  let calls = 0;
  const f = api.memo(() => {
    calls++;
    return undefined;
  });
  f();
  f();
  assert.equal(calls, 1);
  let attempt = 0;
  const g = api.memo(() => {
    if (!attempt++) throw Error("retry");
    return 7;
  });
  assert.throws(g);
  assert.equal(g(), 7);
  assert.equal(g(), 7);
  assert.equal(attempt, 2);
});
test("pipe uses input order and preserves a single function", () => {
  const f = (x) => x + 1;
  assert.equal(api.pipe(f), f);
  assert.equal(api.pipe(f, (x) => x * 2)(3), 8);
  assert.throws(() => api.pipe(), TypeError);
  const object = {};
  assert.equal(api.noop(object), object);
});
test("named easing and segment cycling preserve function identity", () => {
  assert.equal(api.easingDefinitionToFunction("easeIn"), api.easeIn);
  const f = (x) => x * x;
  assert.equal(api.easingDefinitionToFunction(f), f);
  assert.equal(api.getEasingForSegment(["easeIn", "easeOut"], 3), "easeOut");
  const bezier = [0, 0, 1, 1];
  assert.equal(api.getEasingForSegment(bezier, 8), bezier);
});
test("diagnostics warn once per message and expose status", () => {
  const old = console.warn,
    seen = [];
  console.warn = (...args) => seen.push(args);
  try {
    api.warnOnce(true, "test-guard");
    assert.equal(api.hasWarned("test-guard"), false);
    api.warnOnce(false, "test-guard");
    api.warnOnce(false, "test-guard");
    assert.equal(api.hasWarned("test-guard"), true);
    assert.equal(seen.length, 1);
  } finally {
    console.warn = old;
  }
});
test("removing between notifications preserves later addition order", () => {
  const m = new api.SubscriptionManager(),
    seen = [];
  const a = () => seen.push("a"),
    b = () => seen.push("b"),
    c = () => seen.push("c");
  m.add(a);
  const old = m.add(b);
  m.add(c);
  m.remove(b);
  m.add(b);
  old();
  assert.equal(m.getSize(), 3);
  m.notify();
  assert.deepEqual(seen, ["a", "c", "b"]);
});
test("long pipelines invoke transforms without an incidental array receiver", () => {
  const transform = function (value) {
    assert.equal(this, undefined);
    return value + 1;
  };
  assert.equal(api.pipe(...Array(6).fill(transform))(0), 6);
});

test("curve factories retain strict controls and independent function identities", () => {
  for (const invalid of [
    undefined,
    null,
    "0",
    new Number(0),
    NaN,
    Infinity,
    -Infinity,
  ]) {
    for (let position = 0; position < 4; position++) {
      const args = [0.42, 0, 0.58, 1];
      args[position] = invalid;
      assert.throws(() => api.cubicBezier(...args), TypeError);
    }
  }
  const a = api.cubicBezier(0.42, 0, 0.58, 1),
    b = api.cubicBezier(0.42, 0, 0.58, 1);
  assert.notEqual(a, b);
  a.custom = true;
  assert.equal(b.custom, undefined);
  const reflected = api.cubicBezier(1, 1 / 3, 1, 2 / 3);
  for (const x of [0.001, 0.1, 0.5, 0.99, 1 - 1e-9])
    near(reflected(x), 1 - Math.cbrt(1 - x));
});
test("single listener may clear, re-register and recursively notify", () => {
  const m = new api.SubscriptionManager(),
    seen = [];
  m.add(() => {
    seen.push("old");
    m.clear();
    m.add(() => seen.push("new"));
    m.notify();
  });
  m.notify();
  assert.deepEqual(seen, ["old", "new"]);
  m.notify();
  assert.deepEqual(seen, ["old", "new", "new"]);
});
