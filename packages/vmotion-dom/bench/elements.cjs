"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
function makeElement() {
  return Object.assign(new HTMLElement(), {
    nodeType: 1,
    namespaceURI: "http://www.w3.org/1999/xhtml",
    style: {
      setProperty(k, v) {
        this[k] = String(v);
      },
    },
    computed: {
      opacity: ".2",
      width: "20px",
      "--end": "40px",
      transform: "none",
    },
    ownerDocument: { defaultView: window },
  });
}
const specs = [
  {
    name: "create, seek and release an element fade",
    setup(api) {
      const node = makeElement(),
        options = { duration: 1, ease: "linear", autoplay: false };
      return () => {
        const [a] = api.animateElement(node, { opacity: [0, 1] }, options);
        a.time = 0.5;
        api.frameSteps.update.process({
          timestamp: 1000,
          delta: 16,
          isProcessing: true,
        });
        api.styleEffect.flush(node);
        a.stop();
        api.releaseElement(node);
        api.frameSteps.read.process({
          timestamp: 1000,
          delta: 16,
          isProcessing: true,
        });
        return Number(node.style.opacity);
      };
    },
    validate: (x) => assert.equal(x, 0.5),
  },
  {
    name: "resolve, seek and release a variable width animation",
    setup(api) {
      const node = makeElement(),
        options = { duration: 1, ease: "linear", autoplay: false };
      return () => {
        const [a] = api.animateElement(node, { width: "var(--end)" }, options);
        api.flushKeyframeResolvers();
        a.time = 0.5;
        api.frameSteps.update.process({
          timestamp: 1000,
          delta: 16,
          isProcessing: true,
        });
        api.styleEffect.flush(node);
        a.stop();
        api.releaseElement(node);
        api.frameSteps.read.process({
          timestamp: 1000,
          delta: 16,
          isProcessing: true,
        });
        return parseFloat(node.style.width);
      };
    },
    validate: (x) => assert.equal(x, 30),
  },
  {
    name: "seek and paint sixteen element transforms",
    setup(api) {
      const nodes = Array.from({ length: 16 }, makeElement),
        controls = nodes.map(
          (e) =>
            api.animateElement(
              e,
              { x: [0, 100] },
              { duration: 1, ease: "linear", autoplay: false },
            )[0],
        );
      let i = 0;
      return () => {
        const t = (i++ % 100) / 100;
        for (const a of controls) a.time = t;
        api.frameSteps.update.process({
          timestamp: 1000,
          delta: 16,
          isProcessing: true,
        });
        for (const e of nodes) api.styleEffect.flush(e);
        return api.styleEffect.get(nodes[0], "x").get();
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
      validate,
      make(file) {
        global.Element = class {};
        global.HTMLElement = class extends Element {};
        global.SVGElement = class extends Element {};
        global.getComputedStyle = (e) => ({
          ...e.computed,
          getPropertyValue: (k) => e.computed[k] || "",
        });
        global.window = { getComputedStyle };
        const api = require(file);
        api.time.set(1000);
        return setup(api);
      },
    })),
    files: [
      "index.cjs",
      "index.mjs",
      "single.cjs",
      "element.cjs",
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
      "bench/elements.cjs",
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
