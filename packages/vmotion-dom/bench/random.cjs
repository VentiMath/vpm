"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const cases = [
  {
    name: "prepare and sample a 48-item random delay",
    make(file) {
      const api = require(file);
      return () => api.stagger(0.05, { from: "random" })(0, 48);
    },
    validate(v) {
      assert.ok(Number.isFinite(v) && v >= 0 && v <= 2.35);
      assert.ok(Math.abs(v / 0.05 - Math.round(v / 0.05)) < 1e-10);
    },
  },
  {
    name: "sample all 48 stable random delays",
    make(file) {
      const delay = require(file).stagger(0.05, { from: "random" });
      return () => {
        let sum = 0;
        for (let i = 0; i < 48; i++) sum += delay(i, 48);
        return sum;
      };
    },
    validate(v) { assert.ok(Math.abs(v - 56.4) < 1e-10); },
  },
  {
    name: "sample all 48 eased random grid delays",
    make(file) {
      const delay = require(file).stagger(0.05, {
        from: "random", grid: [8, 6], ease: (p) => p * p,
      });
      return () => {
        let sum = 0;
        for (let i = 0; i < 48; i++) sum += delay(i, 48);
        return sum;
      };
    },
    validate(v) { assert.ok(Math.abs(v - 38) < 1e-10); },
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.join(fixture, "node_modules/motion-dom/dist/cjs/index.js"),
    vpm: path.join(root, "index.cjs"),
    cases,
    files: [
      "mapping.cjs",
      "index.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/random.cjs",
      "../vmotion-utils/index.cjs",
      "../../scripts/motion-utils-conformance/package-lock.json",
      "../../scripts/motion-utils-conformance/node_modules/motion-dom",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
