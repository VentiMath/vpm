"use strict";
const assert = require("node:assert/strict");
require("../motion-utils-conformance/check-controls.cjs").check();
global.HTMLElement ??= class {};
global.SVGElement ??= class {};
const vpm = require("../../packages/vmotion-dom");
let checks = 0;
function scenario(api, owned, target, options) {
  let now = 1000,
    tick,
    values = [],
    completed = 0;
  api.time.set(now);
  const value = owned ? api.motionValue(0) : 0;
  const a = api.animateSingleValue(value, target, {
    ...options,
    driver: (fn) => ((tick = fn), { now: () => now, start() {}, stop() {} }),
    onUpdate: (x) => values.push(x),
    onComplete: () => completed++,
  });
  for (let t = 1000; t <= 2200; t += 10) {
    now = t;
    api.time.set(now);
    tick(t);
  }
  a.stop();
  return {
    values,
    completed,
    duration: a.duration,
    owned: owned ? value.get() : undefined,
  };
}
for (const name of ["motion-dom", "motion-dom-app"]) {
  const api = require("../motion-utils-conformance/node_modules/" + name),
    tolerance = name.endsWith("app") ? 0.06 : 0.0002;
  for (const owned of [false, true])
    for (const target of [1, [null, 1], [0, 0.5, 1]])
      for (const options of [
        { duration: 0.2, ease: "linear" },
        { duration: 0.3, delay: 0.1 },
        { duration: 0.2, repeat: 2, repeatDelay: 0.05, repeatType: "reverse" },
        { type: false, delay: 0.1 },
      ]) {
        const a = scenario(api, owned, target, options),
          b = scenario(vpm, owned, target, options);
        assert.equal(a.values.length, b.values.length);
        for (let i = 0; i < a.values.length; i++) {
          assert.ok(Math.abs(a.values[i] - b.values[i]) <= tolerance);
          checks++;
        }
        assert.equal(a.completed, b.completed);
        assert.equal(a.duration, b.duration);
        if (owned) assert.ok(Math.abs(a.owned - b.owned) < tolerance);
        checks += 3;
      }
  console.log(name + ": numeric and MotionValue single-animation callers pass");
}
console.log(checks + " single-animation comparisons pass");
