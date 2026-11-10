"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/motion-utils-conformance");
require(path.join(fixture, "check-controls.cjs")).check();
require("../../../scripts/check-bun.cjs");
const helper = require("../../../scripts/motion-dom-conformance/handoff-fixture.cjs");
const previous = process.env.VMOTION_RENDERER_PREVIOUS === "1";
const baseline = previous
  ? require("../../../scripts/motion-dom-conformance/setup-baseline.cjs").prepare(
      "a3c16a0876979122c03d73850152369113e0e170",
    )
  : undefined;
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream:
      baseline ||
      path.join(fixture, "node_modules/motion-dom/dist/cjs/index.js"),
    vpm: path.join(root, "index.cjs"),
    cases: [false, true].map((async) => ({
      name: `create, resolve, seek and stop a ${async ? "deferred" : "synchronous"} custom animation`,
      make(file) {
        helper.globals();
        const api = require(file);
        class Custom extends api.KeyframeResolver {
          constructor(...args) {
            super(...args);
            this.isAsync = async;
          }
          readKeyframes() {
            this.unresolvedKeyframes = this.unresolvedKeyframes.map((x) =>
              x === "unit" ? 20 : x,
            );
            super.readKeyframes();
          }
        }
        const owner = {
            current: {},
            getProps: () => ({}),
            KeyframeResolver: Custom,
          },
          value = api.motionValue(0),
          options = { duration: 1, ease: "linear", autoplay: false };
        api.time.set(1000);
        return () => {
          value.start(
            api.animateMotionValue("x", value, [0, "unit"], options, owner),
          );
          const a = value.animation;
          a.time = 0.5;
          api.frameSteps.update.process({
            timestamp: 1000,
            delta: 16,
            isProcessing: true,
          });
          const result = value.get();
          value.stop();
          api.frameSteps.read.process({
            timestamp: 1000,
            delta: 16,
            isProcessing: true,
          });
          return result;
        };
      },
      validate: (x) => assert.equal(x, 10),
    })),
    files: [
      ...(previous
        ? [
            "../../scripts/motion-dom-conformance/setup-baseline.cjs",
            "../../scripts/motion-dom-conformance/node_modules/.setup-before-a3c16a08",
          ]
        : []),
      "index.cjs",
      "index.mjs",
      "element.cjs",
      "effects.cjs",
      "transition.cjs",
      "single.cjs",
      "reads.cjs",
      "resolver.cjs",
      "value.cjs",
      "frame.cjs",
      "playback.cjs",
      "mapping.cjs",
      "color.cjs",
      "mix.cjs",
      "spring.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/renderer.cjs",
      "../vmotion-utils/index.cjs",
      "../vmotion-utils/package.json",
      "../../scripts/motion-dom-conformance/handoff-fixture.cjs",
      "../../scripts/motion-utils-conformance/check-controls.cjs",
      "../../scripts/motion-utils-conformance/provenance.json",
      "../../scripts/motion-utils-conformance/node_modules/motion-dom",
      "../../scripts/motion-utils-conformance/node_modules/motion-utils",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
