"use strict";
const assert = require("node:assert/strict");
require("../motion-utils-conformance/check-controls.cjs").check();
const vpm = require("../../packages/vmotion-dom");
const colors = [
  "#000",
  "#fff",
  "#f08",
  "#aabbcc",
  "#1234",
  "#12345678",
  "rgb(20, 40, 60)",
  "rgba(1, 2, 3, .2)",
  "rgb(20 40 60 / .75)",
  "hsl(0,100%,50%)",
  "hsl(120,100%,50%)",
  "hsl(240,100%,50%)",
  "hsla(70, 50%, 30%, .3)",
];
const pairs = [
  ["0px 2px 4px #000", "10px 20px 30px #fff"],
  ["translateX(10px) rotate(0deg)", "translateX(30px) rotate(90deg)"],
  ["blur(0px) brightness(100%)", "blur(10px) brightness(50%)"],
  ["var(--a) 10px", "var(--b) 20px"],
  ["var(--a, calc(1px + 2%)) 10px", "var(--b, calc(3px + 4%)) 20px"],
  ["10px", "20px 30px"],
  ["0px 0px", "10px"],
  ["none", "block"],
  ["block", "none"],
  ["10px #fff", "rgba(0,0,0,1) 20px"],
  ["translate3d(0px, 10px, 0px)", "translate3d(30px, 40px, 20px)"],
];
let checks = 0;
for (const name of ["motion-dom", "motion-dom-app"]) {
  const upstream = require("../motion-utils-conformance/node_modules/" + name);
  for (const a of colors)
    for (const b of colors) {
      const actual = vpm.mixColor(a, b),
        expected = upstream.mixColor(a, b);
      for (const p of [-0.25, 0, 0.1, 0.5, 0.9, 1, 1.25]) {
        assert.equal(actual(p), expected(p), `${name} ${a} -> ${b} @ ${p}`);
        checks++;
      }
    }
  for (const [a, b] of pairs) {
    const actual = vpm.mixComplex(a, b),
      expected = upstream.mixComplex(a, b);
    for (const p of [0, 0.2, 0.5, 1]) {
      assert.equal(actual(p), expected(p), `${name} ${a} -> ${b} @ ${p}`);
      checks++;
    }
  }
  for (const values of [
    ["#000", "#f00", "#fff"],
    ["0px 2px #000", "10px 20px #f00", "30px 40px #fff"],
    [0, 100, 50],
  ])
    for (const descending of [false, true]) {
      const input = descending ? [1, 0.5, 0] : [0, 0.5, 1],
        a = vpm.interpolate(input, values),
        b = upstream.interpolate(input, values);
      for (const p of [-0.1, 0, 0.3, 0.5, 0.75, 1, 1.2]) {
        assert.equal(a(p), b(p));
        checks++;
      }
    }
}
console.log(
  `${checks} color/complex mixer and interpolation comparisons against current 14.7.0 and app 12.36.0 pass.`,
);
