"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/diff-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const cases = require(path.join(fixture, "bench-cases.json")).map((c) => ({
  name: c.name,
  make(file) {
    const api = require(file);
    return () => api[c.mode || "diffWords"](c.a, c.b);
  },
  validate(value) {
    assert.deepEqual(value, c.expected);
  },
}));
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.join(fixture, "node_modules/diff/libcjs/index.js"),
    vpm: path.join(root, "index.cjs"),
    cases,
    files: [
      "index.cjs",
      "index.mjs",
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../../scripts/check-bun.cjs",
      "../../scripts/diff-conformance/check-controls.cjs",
      "../../scripts/diff-conformance/bench-cases.json",
      "../../scripts/diff-conformance/provenance.json",
      "../../scripts/diff-conformance/package-lock.json",
      "../../scripts/diff-conformance/node_modules/diff",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
