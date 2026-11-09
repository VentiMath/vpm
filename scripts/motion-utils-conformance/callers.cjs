"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path");
const dir = path.join(__dirname, "node_modules/.vpm-motion-utils");
function compare(a, b, epsilon) {
  if (typeof a === "number") {
    assert.ok(Math.abs(a - b) <= epsilon, `${a} != ${b}`);
    return;
  }
  assert.equal(typeof a, typeof b);
  assert.deepEqual(Object.keys(a), Object.keys(b));
  for (const k of Object.keys(a)) compare(a[k], b[k], epsilon);
}
for (const version of ["current", "app"]) {
  const expected = require(path.join(dir, version + ".cjs")).run(),
    actual = require(path.join(dir, version + "-vpm.cjs")).run();
  compare(actual, expected, version === "current" ? 2e-6 : 0.0012);
  assert.deepEqual(actual.updates, [1, 2]);
}
console.log(
  "Unchanged Motion14/12 value subscriptions, sampled animations, interpolation and staggering pass.",
);
for (const version of ["current", "app"]) {
  assert.deepEqual(require(path.join(dir, version + ".cjs")).regression(), [
    "first",
  ]);
  assert.deepEqual(require(path.join(dir, version + "-vpm.cjs")).regression(), [
    "first",
    "second",
  ]);
}
console.log(
  "Both unchanged MotionValue callers reproduce the skipped-listener bug with upstream and pass with VPM.",
);
