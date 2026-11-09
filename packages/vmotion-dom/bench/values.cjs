"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const specs = [
  {
    name: "create MotionValue",
    setup: (api) => () => api.motionValue(0),
    validate: (value) => assert.equal(value.get(), 0),
  },
  ...[1, 32].map((count) => ({
    name: `publish to ${count} value subscriber${count === 1 ? "" : "s"}`,
    setup: (api) => {
      const value = api.motionValue(-1);
      let total = 0,
        index = 0;
      for (let i = 0; i < count; i++) value.on("change", (n) => (total += n));
      return () => {
        total = 0;
        value.set((index++ & 1) + 1);
        return total;
      };
    },
    validate: (n) => assert.ok(n === count || n === count * 2),
  })),
  {
    name: "schedule and run 32 frame callbacks",
    setup: (api) => {
      let tick,
        total = 0;
      const batch = api.createRenderBatcher(
          (callback) => (tick = callback),
          true,
        ),
        callbacks = Array.from({ length: 32 }, () => () => total++);
      return () => {
        total = 0;
        for (const callback of callbacks) batch.schedule.update(callback);
        tick();
        return total;
      };
    },
    validate: (n) => assert.equal(n, 32),
  },
  {
    name: "schedule and cancel 32 frame callbacks",
    setup: (api) => {
      let tick,
        total = 0;
      const batch = api.createRenderBatcher(
          (callback) => (tick = callback),
          true,
        ),
        callbacks = Array.from({ length: 32 }, () => () => total++);
      return () => {
        total = 0;
        for (const callback of callbacks) batch.schedule.update(callback);
        for (const callback of callbacks) batch.cancel(callback);
        tick();
        return total;
      };
    },
    validate: (n) => assert.equal(n, 0),
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
      "index.mjs",
      "frame.cjs",
      "value.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/values.cjs",
      "../vmotion-utils/index.cjs",
      "../vmotion-utils/package.json",
      "../../scripts/motion-utils-conformance/provenance.json",
      "../../scripts/motion-utils-conformance/check-controls.cjs",
      "../../scripts/motion-utils-conformance/node_modules/motion-dom",
      "../../scripts/motion-utils-conformance/node_modules/motion-utils",
    ],
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
