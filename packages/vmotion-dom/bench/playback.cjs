"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const specs = [
  {
    name: "create numeric keyframe generator",
    setup: (api) => () =>
      api.keyframes({ keyframes: [0, 100], duration: 300, ease: "linear" }),
    validate: (g) => assert.equal(g.next(150).value, 50),
  },
  {
    name: "sample numeric keyframe generator",
    setup: (api) => {
      const g = api.keyframes({
        keyframes: [0, 100],
        duration: 300,
        ease: "linear",
      });
      let i = 0;
      return () => g.next(i++ % 300).value;
    },
    validate: (x) => assert.ok(x >= 0 && x <= 100),
  },
  {
    name: "create and dispose paused playback",
    setup: (api) => {
      const driver = { now: () => api.time.now(), start() {}, stop() {} };
      const options = {
        keyframes: [0, 100],
        duration: 300,
        ease: "linear",
        autoplay: false,
        driver: () => driver,
      };
      return () => {
        const animation = api.animateValue(options);
        animation.stop();
        return animation.duration;
      };
    },
    validate: (duration) => assert.equal(duration, 0.3),
  },
  {
    name: "advance repeating numeric playback",
    setup: (api) => {
      let update,
        stamp = 1000,
        value = 0;
      api.animateValue({
        keyframes: [0, 100],
        duration: 300,
        ease: "linear",
        repeat: Infinity,
        onUpdate: (x) => {
          value = x;
        },
        driver: (fn) => (
          (update = fn),
          { now: () => api.time.now(), start() {}, stop() {} }
        ),
      });
      return () => {
        update((stamp += 7));
        return value;
      };
    },
    validate: (x) => assert.ok(x >= 0 && x <= 100),
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
      "index.mjs",
      "mapping.cjs",
      "frame.cjs",
      "value.cjs",
      "playback.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/playback.cjs",
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
