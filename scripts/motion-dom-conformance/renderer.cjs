"use strict";
const assert = require("node:assert/strict"),
  helper = require("./handoff-fixture.cjs");
require("../motion-utils-conformance/check-controls.cjs").check();
helper.globals();
const current = require("../motion-utils-conformance/node_modules/motion-dom"),
  vpm = require("../../packages/vmotion-dom");
let checks = 0;
function run(api, async, options, handoff) {
  let reads = 0;
  class Custom extends api.KeyframeResolver {
    constructor(...args) {
      super(...args);
      this.isAsync = async;
    }
    readKeyframes() {
      reads++;
      this.unresolvedKeyframes = this.unresolvedKeyframes.map((v) =>
        v === "unit" ? 20 : v,
      );
      super.readKeyframes();
    }
  }
  const value = api.motionValue(0),
    owner = { current: {}, getProps: () => ({}), KeyframeResolver: Custom },
    animation = api.animateMotionValue(
      "opacity",
      value,
      handoff ? [0, 20] : [null, "unit"],
      { duration: 1, ease: "linear", autoplay: false, ...options },
      owner,
      handoff,
    )(() => {});
  api.flushKeyframeResolvers();
  const samples = [];
  for (const t of [0, 0.1, 0.25, 0.5, 0.9, 1, 1.25, 1.5, 2]) {
    animation.time = t;
    api.frameSteps.update.process({
      timestamp: 1000,
      delta: 16,
      isProcessing: true,
    });
    samples.push(value.get());
  }
  const result = { samples, reads, duration: animation.duration };
  animation.stop();
  return result;
}
for (const async of [false, true])
  for (const handoff of [false, true])
    for (const options of [
      {},
      { delay: 0.2 },
      { delay: -0.2 },
      { duration: 0.5 },
      { repeat: 1 },
      { repeat: 1, repeatType: "reverse" },
      { repeat: 1, repeatType: "mirror", repeatDelay: 0.1 },
      { elapsed: 100 },
      { from: 5 },
      { ease: "easeInOut" },
    ]) {
      const a = run(vpm, async, options, handoff),
        b = run(current, async, options, handoff);
      assert.equal(a.reads, b.reads);
      assert.equal(a.duration, b.duration);
      checks += 2;
      for (let i = 0; i < a.samples.length; i++) {
        assert.ok(
          Math.abs(a.samples[i] - b.samples[i]) < 0.0001,
          JSON.stringify({ async, handoff, options, a, b, i }),
        );
        checks++;
      }
    }
console.log(
  `${checks} renderer-aware adapter/custom resolver comparisons pass against current 14.7.0`,
);
