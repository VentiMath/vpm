"use strict";
const { test } = require("node:test"), assert = require("node:assert/strict");
const { mixColor, rgba } = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
test("color alpha preserves all five-decimal results", () => {
  const mix = mixColor("rgba(0,0,0,0)", "rgba(0,0,0,1)");
  for (let i = 0; i <= 100000; i++) assert.equal(mix(i / 100000), `rgba(0, 0, 0, ${i / 100000})`);
});
test("fractional channels, extrapolation and nonfinite color progress remain checked", () => {
  const a = { red: 12.5, green: 250.75, blue: 4.3, alpha: .00495 };
  const b = { red: 200.1, green: 0.001, blue: 210.9, alpha: .99999 };
  const mix = mixColor(a, b);
  for (const p of [-20, -.1, 0, .000005, .33333, .5, 1, 1.1, 20]) {
    const out = { alpha: a.alpha + (b.alpha - a.alpha) * p };
    for (const key of ["red", "green", "blue"]) out[key] = Math.sqrt(Math.max(0, a[key] ** 2 + (b[key] ** 2 - a[key] ** 2) * p));
    assert.equal(mix(p), rgba.transform(out));
  }
  for (const p of [NaN, Infinity, -Infinity, "0.5", null]) assert.throws(() => mix(p), TypeError);
});
