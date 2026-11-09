"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const previous = process.env.VMOTION_BENCH_PREVIOUS === "1";
const control = previous
  ? require(path.join(fixture, "baseline.cjs")).prepare()
  : path.join(fixture, "node_modules/motion-utils/dist/cjs/index.js");
const specs = [
  {
    name: "Bezier creation",
    setup: (api) => () => api.cubicBezier(0.42, 0, 0.58, 1),
    validate: (value) => assert.ok(Math.abs(value(0.5) - 0.5) < 1e-9),
  },
  {
    name: "easing 100 animation samples",
    setup: (api) => () => {
      let value = 0;
      for (let i = 1; i <= 100; i++) value += api.easeInOut(i / 100);
      return value;
    },
    validate: (value) => assert.ok(Math.abs(value - 50.5) < 1e-5),
  },
  {
    name: "four-stage value pipeline",
    setup: (api) => {
      const pipe = api.pipe(
        (x) => api.clamp(0, 100, x),
        (x) => api.progress(0, 100, x),
        (x) => api.wrap(0, 1, x + 0.25),
        (x) => x * 100,
      );
      let cursor = 0;
      return () => pipe(cursor++ & 1 ? 50 : 0);
    },
    validate: (value) => assert.ok(value === 25 || value === 75),
  },
  ...[1, 32].map((size) => ({
    name: `notify ${size} listener${size === 1 ? "" : "s"}`,
    setup: (api) => {
      const manager = new api.SubscriptionManager();
      let total;
      for (let i = 0; i < size; i++)
        manager.add((value) => {
          total += value;
        });
      return () => {
        total = 0;
        manager.notify(2);
        return total;
      };
    },
    validate: (value) => assert.equal(value, size * 2),
  })),
  {
    name: "32 listener register/remove cycle",
    setup: (api) => {
      const handlers = Array.from({ length: 32 }, () => () => {});
      return () => {
        const manager = new api.SubscriptionManager();
        for (const handler of handlers) manager.add(handler);
        for (const handler of handlers)
          manager.remove ? manager.remove(handler) : undefined;
        return manager.getSize();
      };
    },
    validate: (value) => assert.equal(value, 0),
  },
];
const cases = specs.map(({ name, setup, validate }) => ({
  name,
  make: (file) => setup(require(file)),
  validate,
}));
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: control,
    vpm: path.join(root, "index.cjs"),
    cases,
    files: [
      path.relative(root, control),
      "../../scripts/motion-utils-conformance/baseline.cjs",
      "index.cjs",
      "index.mjs",
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../../scripts/check-bun.cjs",
      "../../scripts/motion-utils-conformance/provenance.json",
      "../../scripts/motion-utils-conformance/check-controls.cjs",
      "../../scripts/motion-utils-conformance/package-lock.json",
      "../../scripts/motion-utils-conformance/node_modules/motion-utils",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
