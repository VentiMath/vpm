"use strict";
const assert = require("node:assert/strict");
require("../motion-utils-conformance/check-controls.cjs").check();
global.Element = class {};
global.HTMLElement = class extends Element {};
global.SVGElement = class extends Element {};
global.getComputedStyle = (e) => ({
  ...e.computed,
  getPropertyValue: (k) => e.computed[k] || "",
});
global.window = { getComputedStyle };
const current = require("../motion-utils-conformance/node_modules/motion-dom"),
  vpm = require("../../packages/vmotion-dom");
function element() {
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
      transform: "none",
      width: "20px",
      "--end": "40px",
    },
    ownerDocument: { defaultView: window },
  });
}
function scenario(api, key, target, options) {
  api.time.set(1000);
  const e = element(),
    controls = api.animateElement(
      e,
      { [key]: target },
      { ...options, autoplay: false },
    );
  api.flushKeyframeResolvers();
  const samples = [];
  for (const t of [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.7]) {
    controls[0].time = t;
    api.frameSteps.update.process({
      timestamp: 1000,
      delta: 16,
      isProcessing: true,
    });
    api.styleEffect.flush(e);
    samples.push(api.styleEffect.get(e, key)?.get());
  }
  const duration = controls[0].duration;
  controls.forEach((c) => c.stop());
  api.releaseElement(e);
  return { samples, duration };
}
let checks = 0;
for (const [key, targets] of [
  ["opacity", [1, [0, 1], [null, 0.4, 1]]],
  ["width", [40, ["20px", "40px"], "var(--end)"]],
  [
    "x",
    [
      [0, 100],
      [null, 20],
    ],
  ],
  ["scale", [[0.2, 1]]],
  ["--size", [["10%", "30%"]]],
])
  for (const target of targets)
    for (const options of [
      { duration: 0.3, ease: "linear" },
      { duration: 0.3, ease: "easeIn", delay: 0.1 },
      {
        duration: 0.2,
        ease: "linear",
        repeat: 1,
        repeatType: "reverse",
        repeatDelay: 0.1,
      },
    ]) {
      const a = scenario(current, key, target, options),
        b = scenario(vpm, key, target, options);
      assert.equal(a.duration, b.duration);
      checks++;
      for (let i = 0; i < a.samples.length; i++) {
        assert.ok(
          Math.abs(parseFloat(a.samples[i]) - parseFloat(b.samples[i])) <
            0.0002,
          `${key} ${JSON.stringify(target)} sample ${i}: ${a.samples[i]} / ${b.samples[i]}`,
        );
        checks++;
      }
    }
console.log(
  checks +
    " element animation comparisons pass against current 14.7.0; app 12.36.0 has no animateElement/animateValues exports",
);

let valueChecks = 0;
for (const target of [20, [null, 20], [0, 10, 20]])
  for (const options of [
    { duration: 0.3, ease: "linear" },
    { duration: 0.5, ease: "easeIn", delay: 0.1 },
  ]) {
    const results = [];
    for (const api of [current, vpm]) {
      const value = api.motionValue(5),
        [a] = api.animateValues(
          () => value,
          { x: target },
          { ...options, autoplay: false },
        );
      api.flushKeyframeResolvers();
      const samples = [];
      for (const t of [0, 0.05, 0.15, 0.3, 0.6]) {
        a.time = t;
        api.frameSteps.update.process({
          timestamp: 1000,
          delta: 16,
          isProcessing: true,
        });
        samples.push(value.get());
      }
      a.stop();
      results.push(samples);
    }
    for (let i = 0; i < results[0].length; i++) {
      assert.ok(Math.abs(results[0][i] - results[1][i]) < 0.0002);
      valueChecks++;
    }
  }
console.log(valueChecks + " caller-owned animateValues comparisons pass");
