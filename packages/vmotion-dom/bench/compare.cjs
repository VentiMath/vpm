"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const specs = [
  {
    name: "opacity mapping",
    setup: (api) => {
      const map = api.interpolate([0, 1], [0, 1]);
      let i = 0;
      return () => map((i++ % 101) / 100);
    },
    validate: (v) => assert.ok(v >= 0 && v <= 1),
  },
  {
    name: "128-keyframe timeline lookup",
    setup: (api) => {
      const input = Array.from({ length: 128 }, (_, i) => i),
        map = api.interpolate(
          input,
          input.map((x) => x * 2),
        );
      let i = 0;
      return () => map((i++ % 127) + 0.5);
    },
    validate: (v) => assert.ok(Number.isInteger(v) && v >= 1 && v <= 253),
  },
  {
    name: "prepare 16-keyframe timeline",
    setup: (api) => {
      const input = Array.from({ length: 16 }, (_, i) => i),
        output = input.map((x) => x * 2);
      return () => api.interpolate(input, output);
    },
    validate: (v) => assert.equal(v(0.25), 0.5),
  },
  {
    name: "20-item centered stagger",
    setup: (api) => {
      const delay = api.stagger(0.05, { from: "center" });
      return () => {
        let sum = 0;
        for (let i = 0; i < 20; i++) sum += delay(i, 20);
        return sum;
      };
    },
    validate: (v) => assert.ok(Math.abs(v - 5) < 1e-12),
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.join(fixture, "node_modules/motion-dom/dist/cjs/index.js"),
    vpm: path.join(root, "index.cjs"),
    cases: specs.map(({ name, setup, validate }) => ({
      name,
      make: (file) => setup(require(file)),
      validate,
    })),
    files: [
      "index.cjs",
      "mapping.cjs",
      "playback.cjs",
      "spring.cjs",
      "effects.cjs",
      "index.mjs",
      "frame.cjs",
      "value.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../vmotion-utils/index.cjs",
      "../vmotion-utils/package.json",
      "../../scripts/motion-utils-conformance/provenance.json",
      "../../scripts/motion-utils-conformance/check-controls.cjs",
      "../../scripts/motion-utils-conformance/node_modules/motion-dom",
      "../../scripts/motion-utils-conformance/node_modules/motion-utils",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
