"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const cases = [
  {
    name: "prepare and sample a color mixer",
    make(file) {
      const api = require(file);
      return () => api.mixColor("#ff000080", "rgba(0,0,255,.25)")(0.5);
    },
    validate: (x) => assert.equal(x, "rgba(180, 0, 180, 0.37598)"),
  },
  {
    name: "sample a prepared color mixer",
    make(file) {
      const fn = require(file).mixColor("#ff000080", "rgba(0,0,255,.25)");
      let n = 0;
      return () => fn((n++ % 100) / 100);
    },
    validate: (x) => assert.match(x, /^rgba\(/),
  },
  {
    name: "prepare and sample a complex shadow mixer",
    make(file) {
      const api = require(file);
      return () =>
        api.mixComplex("0px 2px 4px #000", "10px 20px 30px #fff")(0.5);
    },
    validate: (x) => assert.equal(x, "5px 11px 17px rgba(180, 180, 180, 1)"),
  },
  {
    name: "sample a prepared complex shadow mixer",
    make(file) {
      const fn = require(file).mixComplex(
        "0px 2px 4px #000",
        "10px 20px 30px #fff",
      );
      let n = 0;
      return () => fn((n++ % 100) / 100);
    },
    validate: (x) => assert.match(x, /px rgba\(/),
  },
  {
    name: "sample a prepared numeric interpolation",
    make(file) {
      const fn = require(file).interpolate([0, 0.5, 1], [0, 20, 30]);
      let n = 0;
      return () => fn((n++ % 100) / 100);
    },
    validate: (x) => assert.ok(Number.isFinite(x) && x >= 0 && x <= 30),
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.join(fixture, "node_modules/motion-dom/dist/cjs/index.js"),
    vpm: path.join(root, "index.cjs"),
    cases,
    files: [
      ...require("node:fs")
        .readdirSync(root)
        .filter((x) => x.endsWith(".cjs")),
      "package.json",
      "PROVENANCE.json",
      "bench/mixers.cjs",
      "../vmotion-utils/index.cjs",
      "../vmotion-utils/package.json",
      "../../scripts/motion-utils-conformance/check-controls.cjs",
      "../../scripts/motion-utils-conformance/provenance.json",
      "../../scripts/motion-utils-conformance/node_modules/motion-dom",
      "../../scripts/motion-utils-conformance/node_modules/motion-utils",
    ],
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
