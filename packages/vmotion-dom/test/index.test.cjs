"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
test("numeric ranges clamp, extrapolate, reverse and cross duplicate boundaries", () => {
  assert.equal(api.interpolate([0, 1], [0, 100])(0.25), 25);
  assert.equal(api.interpolate([0, 1], [0, 100])(2), 100);
  assert.equal(api.interpolate([0, 1], [0, 100], { clamp: false })(2), 200);
  assert.equal(api.interpolate([1, 0], [100, 0])(0.25), 25);
  assert.equal(api.interpolate([0, 0, 1], [0, 5, 10])(0), 5);
  assert.equal(api.interpolate([0, 1, 1], [0, 5, 10])(1), 10);
  assert.equal(api.interpolate([0], [7])(NaN), 7);
  assert.equal(api.interpolate([1, 0, 0], [0, 5, 10], { clamp: false })(-1), 5);
  assert.equal(api.interpolate([0, 0, 1], [0, 5, 10], { clamp: false })(-1), 0);
  assert.equal(api.interpolate([0, 0], [0, 5], { clamp: false })(-1), 0);
  assert.ok(Number.isNaN(api.interpolate([0, 1], [0, 1])(NaN)));
});
test("long timelines choose the correct interval including each exact boundary", () => {
  const inputs = Array.from({ length: 257 }, (_, i) => i / 256),
    values = inputs.map((x) => x * x);
  const map = api.interpolate(inputs, values);
  for (let i = 0; i < 256; i++) {
    assert.equal(map(inputs[i]), values[i]);
    assert.equal(map((i + 0.5) / 256), (values[i] + values[i + 1]) / 2);
  }
});
test("construction snapshots ranges and the easing list", () => {
  const inputs = [0, 0.5, 1],
    outputs = [0, 10, 20],
    eases = [(x) => x * x, (x) => x];
  const map = api.interpolate(inputs, outputs, { ease: eases });
  inputs.fill(0);
  outputs.fill(0);
  eases.fill(() => 0);
  assert.equal(map(0.25), 2.5);
  assert.equal(map(0.75), 15);
});
test("custom mixers work without string parsing or caller mutation", () => {
  const input = Object.freeze([0, 1]),
    output = Object.freeze([{ x: 0 }, { x: 10 }]);
  let calls = 0;
  const map = api.interpolate(input, output, {
    mixer: (a, b) => {
      calls++;
      return (p) => ({ x: a.x + (b.x - a.x) * p });
    },
  });
  assert.deepEqual(map(0.5), { x: 5 });
  assert.deepEqual(map(0.2), { x: 2 });
  assert.equal(calls, 1);
});
test("easing applies per segment including missing easing entries", () => {
  const map = api.interpolate([0, 0.5, 1], [0, 10, 20], {
    ease: [(x) => x * x],
  });
  assert.equal(map(0.25), 2.5);
  assert.equal(map(0.75), 15);
});
test("bad configurations and unfinished capabilities reject explicitly", () => {
  for (const [a, b] of [
    [[], []],
    [[0], [0, 1]],
    [
      [0, 2, 1],
      [0, 1, 2],
    ],
    [
      [0, NaN],
      [0, 1],
    ],
    [
      [0, 1],
      [0, Infinity],
    ],
  ])
    assert.throws(() => api.interpolate(a, b), TypeError);
  assert.equal(api.interpolate([0, 1], ["red", "blue"])(0.5), "blue");
  assert.throws(
    () => api.interpolate([0, 1], [0, 1], { mixer: () => null }),
    /return a function/,
  );
  assert.throws(
    () => api.interpolate([0, 1], [0, 1], { ease: "easeIn" }),
    /easing/,
  );
  assert.throws(() => api.stagger(0.1, { grid: [0, 2] }), /grid/);
  assert.throws(() => api.stagger(0.1, { from: "unknown" }), /origin/);
  assert.throws(() => api.stagger(Infinity), /finite/);
});
test("stagger origins and eased delays match independently calculated distances", () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((i) => api.stagger(0.25, { from: "center" })(i, 5)),
    [0.5, 0.25, 0, 0.25, 0.5],
  );
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((i) => api.stagger(0.25, { from: "edges" })(i, 5)),
    [0, 0.25, 0.5, 0.25, 0],
  );
  assert.equal(api.stagger(0.5, { from: "last", startDelay: 1 })(0, 3), 2);
  assert.equal(api.stagger(0.5, { from: 1 })(0, 3), 0.5);
  assert.equal(api.stagger(0.5, { ease: (x) => x * x })(1, 2), 0.25);
  assert.throws(() => api.stagger()(1, 1), RangeError);
  assert.throws(() => api.stagger()(0, 0), RangeError);
});

test("sparse numeric ranges cannot bypass finite-value validation", () => {
  assert.throws(() => api.interpolate([0, , 1], [0, 1, 2]), TypeError);
  assert.throws(() => api.interpolate([0, 0.5, 1], [0, , 2]), TypeError);
});

test("grid staggering snapshots dimensions and rescales for changing collections", () => {
  const grid = [3, 3],
    delay = api.stagger(0.1, { grid, from: "center", ease: (x) => x * x });
  grid.fill(99);
  assert.equal(delay(4, 9), 0);
  assert.ok(Math.abs(delay(0, 9) - Math.SQRT2 * 0.1) < 1e-12);
  assert.ok(Number.isFinite(delay(0, 1)));
  assert.equal(delay(4, 9), 0);
  const edge = api.stagger(0.2, { grid: [3, 3], from: "edges" });
  assert.equal(edge(4, 9), 0.2);
  assert.equal(edge(8, 9), 0);
  for (const grid of [
    Array(2),
    null,
    [],
    [2],
    [2, 2, 2],
    [2, 0],
    [NaN, 2],
    [2, 1.5],
  ])
    assert.throws(() => api.stagger(0.1, { grid }), /grid/);
});

test("grid geometry caches never cache user easing results", () => {
  let calls = 0;
  const delay = api.stagger(0.1, {
    grid: [3, 3],
    ease: (p) => {
      calls++;
      return p;
    },
  });
  const first = delay(8, 9);
  assert.equal(delay(8, 9), first);
  assert.equal(calls, 2);
  assert.ok(Number.isFinite(delay(0, 5000)));
  assert.equal(delay(8, 9), first);
});

test("random delays are a stable permutation and refresh only when size changes", () => {
  const saved = Math.random;
  let calls = 0;
  Math.random = () => {
    calls++;
    return 0.25;
  };
  try {
    const delay = api.stagger(0.25, { from: "random", startDelay: 2 });
    assert.equal(calls, 0);
    const values = Array.from({ length: 8 }, (_, i) => delay(i, 8));
    assert.deepEqual(
      [...values].sort((a, b) => a - b),
      Array.from({ length: 8 }, (_, i) => 2 + i * 0.25),
    );
    assert.equal(calls, 7);
    for (let i = 7; i >= 0; i--) assert.equal(delay(i, 8), values[i]);
    assert.equal(calls, 7);
    assert.equal(delay(0, 1), 2);
    assert.equal(calls, 7);
    const fewer = Array.from({ length: 3 }, (_, i) => delay(i, 3));
    assert.equal(calls, 9);
    assert.equal(new Set(fewer).size, 3);
    assert.throws(() => delay(-1, 3), RangeError);
    assert.throws(() => delay(1, 1), RangeError);
  } finally {
    Math.random = saved;
  }
});
test("random grid ordering has unique ranks and live easing callbacks", () => {
  let calls = 0;
  const delay = api.stagger(-0.1, {
    from: "random",
    grid: [3, 2],
    ease: (p) => {
      calls++;
      return p * p;
    },
  });
  const expected = Array.from(
    { length: 6 },
    (_, i) => -0.1 * (i / 5) ** 2 * 5,
  ).sort((a, b) => a - b);
  const actual = Array.from({ length: 6 }, (_, i) => delay(i, 6)).sort(
    (a, b) => a - b,
  );
  for (let i = 0; i < 6; i++)
    assert.ok(Math.abs(actual[i] - expected[i]) < 1e-12);
  delay(0, 6);
  assert.equal(calls, 7);
  assert.equal(api.stagger(0.5, { from: "random", ease: () => 0.25 })(0, 1), 0.125);
});

test("grid easing keeps each call's scale during reentrant size changes", () => {
  let nested = false,
    innerTotal = 99,
    calls = 0;
  const delay = api.stagger(0.1, {
    grid: [3, 3],
    ease: (p) => {
      calls++;
      if (!nested) {
        nested = true;
        delay(0, innerTotal);
        nested = false;
      }
      return p;
    },
  });
  for (const [index, total, inner] of [[8, 9, 99], [8, 9, 5000], [4999, 5000, 9], [8, 9, 1]]) {
    innerTotal = inner;
    const expected = 0.1 * Math.hypot(index % 3, Math.floor(index / 3));
    assert.ok(Math.abs(delay(index, total) - expected) < 1e-12);
  }
  assert.equal(calls, 7); // The zero-distance one-item grid does not call easing.
});

test("throwing grid easing leaves subsequent samples valid after nested reads", () => {
  let fail = true,
    nested = false;
  const delay = api.stagger(-0.25, {
    grid: [3, 3],
    from: "center",
    startDelay: 2,
    ease: (p) => {
      if (fail && !nested) {
        nested = true;
        delay(0, 5000);
        nested = false;
        throw Error("easing");
      }
      return p * p;
    },
  });
  assert.throws(() => delay(0, 9), /easing/);
  fail = false;
  assert.equal(delay(4, 9), 2);
  assert.ok(Math.abs(delay(0, 9) - (2 - Math.SQRT2 * 0.25)) < 1e-12);
});
