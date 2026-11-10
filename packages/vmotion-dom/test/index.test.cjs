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
  assert.equal(api.interpolate([0, 1], ["red", "blue"])(.5), "blue");
  assert.throws(
    () => api.interpolate([0, 1], [0, 1], { mixer: () => null }),
    /return a function/,
  );
  assert.throws(
    () => api.interpolate([0, 1], [0, 1], { ease: "easeIn" }),
    /easing/,
  );
  assert.throws(() => api.stagger(0.1, { grid: [2, 2] }), /not implemented/);
  assert.throws(() => api.stagger(0.1, { from: "random" }), /origin/);
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
