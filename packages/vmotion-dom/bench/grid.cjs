"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const options = { grid: [8, 6], from: "center", ease: (p) => p * p };
const maximum = Math.hypot(3.5, 2.5);
let expected = 0;
for (let i = 0; i < 48; i++)
  expected +=
    (0.05 * (((i % 8) - 3.5) ** 2 + (Math.floor(i / 8) - 2.5) ** 2)) / maximum;
const cases = [
  {
    name: "prepare and sample a grid delay",
    make(file) {
      const api = require(file);
      return () => api.stagger(0.05, options)(0, 48);
    },
    validate(v) {
      assert.ok(Math.abs(v - 0.05 * maximum) < 1e-12);
    },
  },
  {
    name: "sample all 48 eased grid delays",
    make(file) {
      const delay = require(file).stagger(0.05, options);
      return () => {
        let sum = 0;
        for (let i = 0; i < 48; i++) sum += delay(i, 48);
        return sum;
      };
    },
    validate(v) {
      assert.ok(Math.abs(v - expected) < 1e-10);
    },
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
      "bench/grid.cjs",
      "../vmotion-utils/index.cjs",
      "../../scripts/motion-utils-conformance/package-lock.json",
      "../../scripts/motion-utils-conformance/node_modules/motion-dom",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
