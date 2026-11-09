"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
function element() {
  return {
    nodeType: 1,
    style: {
      setProperty(k, v) {
        this[k] = String(v);
      },
    },
    attrs: {},
    setAttribute(k, v) {
      this.attrs[k] = String(v);
    },
  };
}
const previous = process.env.VMOTION_DOM_BENCH_PREVIOUS === "1";
const control = previous
  ? require("../../../scripts/motion-dom-conformance/baseline.cjs").prepare()
  : path.join(fixture, "node_modules/motion-dom/dist/cjs/index.js");
const data = { timestamp: 100, delta: 16, isProcessing: true };
const specs = [
  {
    name: "bind, paint and dispose opacity/width/scale",
    setup(api) {
      const values = {
        opacity: api.motionValue(0.5),
        width: api.motionValue(10),
        scale: api.motionValue(2),
      };
      return () => {
        const e = element(),
          off = api.styleEffect([e], values);
        api.frameSteps.render.process(data);
        off();
        return e.style.transform;
      };
    },
    validate: (v) => assert.equal(v, "scale(2)"),
  },
  {
    name: "update one opacity binding",
    setup(api) {
      const e = element(),
        v = api.motionValue(0.5);
      api.styleEffect([e], { opacity: v });
      let i = 0;
      return () => {
        v.set((i++ % 100) / 100);
        api.frameSteps.render.process(data);
        return e.style.opacity;
      };
    },
    validate: (v) => assert.ok(v >= 0 && v < 1),
  },
  {
    name: "compose three changing transforms",
    setup(api) {
      const e = element(),
        v = api.motionValue(0);
      api.styleEffect([e], { x: v, scale: v, rotate: v });
      let i = 0;
      return () => {
        v.set(++i % 100);
        api.frameSteps.render.process(data);
        return e.style.transform;
      };
    },
    validate: (v) => assert.equal(typeof v, "string"),
  },
  {
    name: "publish opacity to 32 elements",
    setup(api) {
      const list = Array.from({ length: 32 }, element),
        v = api.motionValue(0.5);
      api.styleEffect(list, { opacity: v });
      let i = 0;
      return () => {
        v.set((++i % 100) / 100);
        api.frameSteps.render.process(data);
        return list[31].style.opacity;
      };
    },
    validate: (v) => assert.ok(v >= 0 && v < 1),
  },
  {
    name: "update SVG path length and offset",
    setup(api) {
      const e = element(),
        v = api.motionValue(0.5);
      api.svgEffect([e], { pathLength: v, pathOffset: v });
      let i = 0;
      return () => {
        v.set((++i % 100) / 100);
        api.frameSteps.render.process(data);
        return e.attrs["stroke-dasharray"];
      };
    },
    validate: (v) => assert.equal(typeof v, "string"),
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: control,
    vpm: path.join(root, "index.cjs"),
    cases: specs.map(({ name, setup, validate }) => ({
      name,
      make: (file) => setup(require(file)),
      validate,
    })),
    files: [
      path.relative(root, previous ? path.dirname(control) : control),
      "../../scripts/motion-dom-conformance/baseline.cjs",
      "index.cjs",
      "index.mjs",
      "effects.cjs",
      "frame.cjs",
      "value.cjs",
      "mapping.cjs",
      "playback.cjs",
      "spring.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/effects.cjs",
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
