"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const options = {
  keyframes: [0, 1],
  stiffness: 550,
  damping: 30,
  restSpeed: 10,
};
const cases = [
  {
    name: "create calendar scale spring",
    setup: (api) => () => api.spring(options),
    validate: (g) => assert.ok(g.next(100).value > 0),
  },
  {
    name: "sample spring value and velocity",
    setup: (api) => {
      const g = api.spring(options);
      let i = 0;
      return () => {
        const t = (i++ * 17) % 300;
        return g.next(t).value + g.velocity(t);
      };
    },
    validate: (x) => assert.ok(Number.isFinite(x)),
  },
  {
    name: "create duration-calibrated spring",
    setup: (api) => () =>
      api.spring({ keyframes: [0, 1], duration: 800, bounce: 0.3 }),
    validate: (g) => assert.equal(g.calculatedDuration, 800),
  },
  {
    name: "create, measure and dispose spring playback",
    setup: (api) => {
      const driver = { now: () => api.time.now(), start() {}, stop() {} };
      return () => {
        const a = api.animateValue({
          ...options,
          type: "spring",
          autoplay: false,
          driver: () => driver,
        });
        const duration = a.duration;
        a.stop();
        return duration;
      };
    },
    validate: (d) => assert.equal(d, 0.3),
  },
  {
    name: "advance repeating scale spring",
    setup: (api) => {
      let tick,
        t = 1000,
        value;
      api.time.set(1000);
      api.animateValue({
        ...options,
        type: "spring",
        repeat: Infinity,
        driver: (f) => ((tick = f), { now: () => 1000, start() {}, stop() {} }),
        onUpdate: (x) => (value = x),
      });
      return () => {
        tick((t += 7));
        return value;
      };
    },
    validate: (x) => assert.ok(x >= 0 && x < 1.2),
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.join(fixture, "node_modules/motion-dom/dist/cjs/index.js"),
    vpm: path.join(root, "index.cjs"),
    cases: cases.map(({ name, setup, validate }) => ({
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
      "spring.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/spring.cjs",
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
