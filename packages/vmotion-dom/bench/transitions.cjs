"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const specs = [
  {
    name: "create and dispose opacity transition",
    setup: (api) => {
      const value = api.motionValue(0);
      const driver = { now: () => 1000, start() {}, stop() {} };
      const options = {
        duration: 0.3,
        ease: "linear",
        autoplay: false,
        driver: () => driver,
      };
      return () => {
        const a = api.animateMotionValue(
          "opacity",
          value,
          1,
          options,
        )(() => {});
        const d = a.duration;
        a.stop();
        return d;
      };
    },
    validate: (d) => assert.equal(d, 0.3),
  },
  {
    name: "create and dispose calendar scale transition",
    setup: (api) => {
      const value = api.motionValue(0);
      const driver = { now: () => 1000, start() {}, stop() {} };
      const options = {
        ...api.getDefaultTransition("scale", { keyframes: [0, 1] }),
        delay: 0.3,
        autoplay: false,
        driver: () => driver,
      };
      return () => {
        const a = api.animateMotionValue("scale", value, 1, options)(() => {});
        const d = a.duration;
        a.stop();
        return d;
      };
    },
    validate: (d) => assert.ok(d > 0.1 && d < 2),
  },
  {
    name: "advance repeating opacity transition",
    setup: (api) => {
      let tick,
        now = 1000;
      api.time.set(now);
      const value = api.motionValue(0);
      api.animateMotionValue("opacity", value, 1, {
        duration: 0.3,
        ease: "linear",
        repeat: Infinity,
        driver: (fn) => (
          (tick = fn),
          { now: () => 1000, start() {}, stop() {} }
        ),
      })(() => {});
      return () => {
        tick((now += 7));
        return value.get();
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
        // Identical browser type guards for both implementations; no DOM I/O timed.
        global.HTMLElement ??= class {};
        global.SVGElement ??= class {};
        return setup(require(file));
      },
      validate,
    })),
    files: [
      "index.cjs",
      "index.mjs",
      "transition.cjs",
      "mapping.cjs",
      "frame.cjs",
      "value.cjs",
      "playback.cjs",
      "spring.cjs",
      "effects.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/transitions.cjs",
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
