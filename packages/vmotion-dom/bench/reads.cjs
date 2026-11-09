"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const previous = process.env.VMOTION_DOM_SETUP_PREVIOUS === "1";
const control = previous
  ? require("../../../scripts/motion-dom-conformance/setup-baseline.cjs").prepare()
  : path.join(fixture, "node_modules/motion-dom/dist/cjs/index.js");
const specs = [
  {
    name: "read three components of one matrix",
    setup: (api) => () => {
      const m = "matrix(2, 0, 0, 3, 10, 20)";
      return (
        api.parseValueFromTransform(m, "x") +
        api.parseValueFromTransform(m, "y") +
        api.parseValueFromTransform(m, "scaleX")
      );
    },
    validate: (x) => assert.equal(x, 32),
  },
  {
    name: "read changing transform matrices",
    setup: (api) => {
      const matrices = Array.from(
        { length: 64 },
        (_, i) => `matrix(2, 0, 0, 3, ${i}, 20)`,
      );
      let n = 0;
      return () => api.parseValueFromTransform(matrices[n++ % 64], "x");
    },
    validate: (x) => assert.ok(x >= 0 && x < 64),
  },
  {
    name: "read computed opacity",
    setup: (api) => {
      const node = {
        computed: { opacity: ".4" },
        ownerDocument: { defaultView: { getComputedStyle: (e) => e.computed } },
      };
      return () => api.readStyleValue(node, "opacity");
    },
    validate: (x) => assert.equal(x, ".4"),
  },
  {
    name: "resolve current numeric keyframe and wildcards",
    setup: (api) => {
      const value = api.motionValue(5);
      return () => {
        let result;
        new api.KeyframeResolver(
          [null, null, 100],
          (x) => (result = x),
          "opacity",
          value,
        ).scheduleResolve();
        return result;
      };
    },
    validate: (x) => assert.deepEqual(x, [5, 5, 100]),
  },
  {
    name: "resolve DOM start and CSS variable endpoint",
    setup: (api) => {
      const node = {
        computed: {
          width: "20px",
          getPropertyValue: (k) => (k === "--width" ? "40px" : ""),
        },
        ownerDocument: { defaultView: { getComputedStyle: (e) => e.computed } },
      };
      const element = {
        current: node,
        readValue: (key) => api.readStyleValue(node, key),
      };
      return () => {
        let result;
        new api.DOMKeyframesResolver(
          [null, "var(--width)"],
          (x) => (result = x),
          "width",
          undefined,
          element,
        ).scheduleResolve();
        api.flushKeyframeResolvers();
        return result;
      };
    },
    validate: (x) => assert.deepEqual(x.map(parseFloat), [20, 40]),
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: control,
    vpm: path.join(root, "index.cjs"),
    cases: specs.map(({ name, setup, validate }) => ({
      name,
      make: (file) => {
        global.getComputedStyle = (e) => e.computed;
        global.window = { getComputedStyle: global.getComputedStyle };
        return setup(require(file));
      },
      validate,
    })),
    files: [
      "../../scripts/motion-dom-conformance/setup-baseline.cjs",
      path.relative(root, previous ? path.dirname(control) : control),
      "index.cjs",
      "element.cjs",
      "single.cjs",
      "index.mjs",
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
      "bench/reads.cjs",
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
