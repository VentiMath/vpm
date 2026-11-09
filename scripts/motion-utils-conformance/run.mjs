import assert from "node:assert/strict";
import * as current from "motion-utils";
import * as app from "motion-utils-app";
import * as vpm from "../../packages/vmotion-utils/index.mjs";
let count = 0,
  maxError = 0;
for (const control of [current, app]) {
  console.log(control === current ? "current14" : "app12");
  assert.deepEqual(Object.keys(vpm), Object.keys(control));
  for (const name of [
    "easeIn",
    "easeOut",
    "easeInOut",
    "backIn",
    "backOut",
    "backInOut",
    "circIn",
    "circOut",
    "circInOut",
    "anticipate",
  ])
    for (let i = 0; i <= 1000; i++) {
      const expected = control[name](i / 1000),
        actual = vpm[name](i / 1000),
        error = Math.abs(expected - actual);
      maxError = Math.max(maxError, error);
      assert.ok(
        error < (control === current ? 2e-6 : 0.0012),
        `${name} ${i}: ${actual} != ${expected}`,
      );
      count++;
    }
  for (const controls of [
    [0, 0, 1, 1],
    [0, 0, 0, 1],
    [1, 0, 1, 1],
    [0.25, -0.4, 0.75, 1.5],
    [0.01, 1.5, 0.99, -0.5],
    [0.35, 0.17, 0.3, 0.86],
  ])
    for (let i = 0; i <= 500; i++) {
      const expected = control.cubicBezier(...controls)(i / 500),
        actual = vpm.cubicBezier(...controls)(i / 500);
      assert.ok(
        Math.abs(expected - actual) < (control === current ? 2e-6 : 0.005),
        `bezier ${controls} at ${i}: ${actual} != ${expected}`,
      );
      count++;
    }
  for (const name of [
    "isNumericalString",
    "isZeroValueString",
    "isObject",
    "isBezierDefinition",
    "isEasingArray",
  ])
    for (const value of [
      "",
      "0",
      "00",
      "-0",
      ".5",
      "1.0",
      "1.",
      "1e3",
      "0px",
      "0.0px",
      "0%",
      "0 px",
      "1\n",
      "0px\n",
      "-2",
      " 1",
      "1 ",
      "+1",
      [],
      [1],
      [0, 0, 1, 1],
      ["easeIn"],
      {},
      null,
      undefined,
      NaN,
      0,
      () => 1,
    ]) {
      assert.deepEqual(
        vpm[name](value),
        control[name](value),
        name + " " + value,
      );
      count++;
    }
  for (const name of ["clamp", "progress", "wrap"])
    for (const a of [-10, 0, 1, 100])
      for (const b of [-1, 0, 1, 100])
        for (const value of [-100, -1, 0, 0.5, 1, 50, 100, Infinity, NaN]) {
          assert.equal(
            vpm[name](a, b, value),
            control[name](a, b, value),
            `${name} ${a} ${b} ${value}`,
          );
          count++;
        }
  for (const name of ["secondsToMilliseconds", "millisecondsToSeconds"])
    for (const v of [-10, -0, 0, 0.1, 1, 100, NaN, Infinity]) {
      assert.equal(vpm[name](v), control[name](v));
      count++;
    }
  for (const a of [-2, 0, 1, 100])
    for (const b of [-1, 0, 0.1, 16.7, 100]) {
      assert.equal(
        vpm.velocityPerSecond(a, b),
        control.velocityPerSecond(a, b),
      );
      count++;
    }
  for (const n of [1, 2, 3, 4, 10, 10000])
    for (const dir of ["start", "end"])
      for (const v of [-1, 0, 0.001, 0.1, 0.25, 0.5, 0.75, 0.999, 1, 2]) {
        assert.equal(vpm.steps(n, dir)(v), control.steps(n, dir)(v));
        count++;
      }
  for (const from of [-5, -3, -1, 0, 1, 2, 3, 4])
    for (const to of [-5, -1, 0, 1, 3, 5]) {
      assert.deepEqual(
        vpm.moveItem([1, 2, 3], from, to),
        control.moveItem([1, 2, 3], from, to),
        `move ${from} ${to}`,
      );
      count++;
    }
}
console.log(
  `${count} current/app comparisons pass; built-in curve maximum delta ${maxError}.`,
);
