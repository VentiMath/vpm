"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const previous = process.env.VMOTION_MIXERS_PREVIOUS === "1";
const baseline = previous
  ? require("../../../scripts/motion-dom-conformance/setup-baseline.cjs").prepare(
      "ca65b070cb796674f7ee01a2b1bcab81d19dad6f",
    )
  : undefined;
const cases = [
  {
    name: "prepare and sample a repeated color mixer",
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
    name: "prepare and sample a repeated complex shadow mixer",
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
    name: "prepare color mixers with changing uncached endpoints",
    make(file) {
      const api = require(file);
      let n = 0;
      return () => {
        const v = n++ % 512;
        return api.mixColor(
          `rgb(${v % 256}, ${Math.floor(v / 256)}, 0)`,
          `rgb(0, ${v % 256}, ${Math.floor(v / 256)})`,
        )(0.5);
      };
    },
    validate: (x) => assert.match(x, /^rgba\(/),
  },
  {
    name: "prepare shadow mixers with changing uncached endpoints",
    make(file) {
      const api = require(file);
      let n = 0;
      return () => {
        const v = n++ % 512;
        return api.mixComplex(`${v}px 2px #000`, `${v + 10}px 20px #fff`)(0.5);
      };
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
    upstream:
      baseline ||
      path.join(fixture, "node_modules/motion-dom/dist/cjs/index.js"),
    vpm: path.join(root, "index.cjs"),
    cases,
    files: [
      ...(previous
        ? [
            "../../scripts/motion-dom-conformance/setup-baseline.cjs",
            "../../scripts/motion-dom-conformance/node_modules/.setup-before-ca65b070",
          ]
        : []),
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
