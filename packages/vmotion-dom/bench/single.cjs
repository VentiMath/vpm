"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const specs = [
  {
    name: "create and stop a scalar animation",
    setup: (api) => {
      const options = {
        duration: 0.3,
        ease: "linear",
        autoplay: false,
        driver: () => ({ now: () => api.time.now(), start() {}, stop() {} }),
      };
      return () => {
        const a = api.animateSingleValue(0, 1, options);
        const duration = a.duration;
        a.stop();
        return duration;
      };
    },
    validate: (x) => assert.equal(x, 0.3),
  },
  {
    name: "reset, replace and stop a MotionValue animation",
    setup: (api) => {
      const value = api.motionValue(0);
      const options = {
        duration: 0.3,
        ease: "linear",
        autoplay: false,
        driver: () => ({ now: () => api.time.now(), start() {}, stop() {} }),
      };
      return () => {
        value.jump(0);
        const a = api.animateSingleValue(value, 1, options);
        const duration = a.duration;
        value.stop();
        return duration;
      };
    },
    validate: (x) => assert.equal(x, 0.3),
  },
  {
    name: "deliver repeating single-value updates",
    setup: (api) => {
      let now = 1000,
        tick,
        value = 0;
      api.time.set(now);
      api.animateSingleValue(0, 1, {
        duration: 0.3,
        ease: "linear",
        repeat: Infinity,
        driver: (fn) => (
          (tick = fn),
          { now: () => 1000, start() {}, stop() {} }
        ),
        onUpdate: (x) => (value = x),
      });
      return () => {
        tick((now += 7));
        return value;
      };
    },
    validate: (x) => assert.ok(x >= 0 && x <= 1),
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.join(fixture, "node_modules/motion-dom/dist/cjs/index.js"),
    vpm: path.join(root, "index.cjs"),
    cases: specs.map(({ name, setup, validate }) => ({
      name,
      make: (file) => {
        global.HTMLElement ??= class {};
        global.SVGElement ??= class {};
        return setup(require(file));
      },
      validate,
    })),
    files: [
      "index.cjs",
      "index.mjs",
      "single.cjs",
      "reads.cjs",
      "resolver.cjs",
      "frame.cjs",
      "value.cjs",
      "transition.cjs",
      "effects.cjs",
      "mapping.cjs",
      "spring.cjs",
      "playback.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/single.cjs",
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
