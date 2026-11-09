"use strict";
const assert = require("node:assert/strict");
require("../motion-utils-conformance/check-controls.cjs").check();
const vpm = require("../../packages/vmotion-dom");
let checks = 0;
function near(a, b, tolerance = 2e-4) {
  checks++;
  assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
}
function harness(api, options = {}) {
  let now = 1000,
    update;
  const values = [],
    events = [];
  api.time.set(now);
  const animation = api.animateValue({
    keyframes: [0, 100],
    duration: 100,
    ease: "linear",
    driver: (fn) => ((update = fn), { now: () => now, start() {}, stop() {} }),
    onUpdate: (value) => values.push(value),
    onComplete: () => events.push("complete"),
    ...options,
  });
  return {
    animation,
    values,
    events,
    tick(t) {
      now = t;
      api.time.set(t);
      update(t);
      return values.at(-1);
    },
  };
}
for (const name of ["motion-dom", "motion-dom-app"]) {
  const control = require("../motion-utils-conformance/node_modules/" + name);
  const tolerance = name.endsWith("app") ? 0.06 : 0.0002;
  for (const values of [[0, 1], [0, 10, 30], [10, -50, 70, 10], [5]])
    for (const duration of [0, 1, 100, 300])
      for (const ease of [
        "linear",
        "easeIn",
        "easeInOut",
        [0.1, 0.3, 0.8, 0.9],
      ]) {
        const options = { keyframes: values, duration, ease };
        const a = control.keyframes(options),
          b = vpm.keyframes(options);
        for (let t = -10; t <= 350; t += 7) {
          const x = { ...a.next(t) },
            y = { ...b.next(t) };
          near(x.value, y.value, tolerance);
          assert.equal(x.done, y.done);
          checks++;
        }
      }
  for (const repeatType of ["loop", "reverse", "mirror"])
    for (const repeat of [0, 1, 2, Infinity])
      for (const delay of [-30, 0, 50]) {
        const options = { repeatType, repeat, delay, repeatDelay: 20 };
        const a = harness(control, options),
          b = harness(vpm, options);
        for (let t = 1000; t <= 1400; t += 5) {
          near(a.tick(t), b.tick(t));
          assert.equal(a.animation.state, b.animation.state);
          checks++;
        }
        assert.deepEqual(a.events, b.events);
        checks++;
        a.animation.stop();
        b.animation.stop();
      }
  // Compare public values after frame delivery, not private clock anchors.
  for (const delay of [0, 50]) {
    const a = harness(control, { delay }),
      b = harness(vpm, { delay });
    const tick = (t) => near(a.tick(t), b.tick(t));
    tick(1000);
    tick(1075);
    a.animation.pause();
    b.animation.pause();
    tick(1125);
    a.animation.play();
    b.animation.play();
    tick(1135);
    a.animation.speed = 0.5;
    b.animation.speed = 0.5;
    tick(1145);
    a.animation.speed = -1;
    b.animation.speed = -1;
    if (delay === 0) tick(1150);
    else {
      // Upstream reapplies the delay with the opposite sign, causing a jump.
      near(a.tick(1150), 0);
      near(b.tick(1150), 35);
    }
    a.animation.speed = 1;
    b.animation.speed = 1;
    a.animation.cancel();
    b.animation.cancel();
    near(b.values.at(-1), 0);
    a.animation.play();
    b.animation.play();
    tick(1180);
    a.animation.stop();
    b.animation.stop();
  }
  const a = harness(control),
    b = harness(vpm);
  a.tick(1000);
  b.tick(1000);
  a.animation.time = 0.05;
  b.animation.time = 0.05;
  near(a.tick(1010), b.tick(1010));
  a.animation.stop();
  b.animation.stop();
  console.log(
    name + ": numeric generators, repeated playback, seeking and controls pass",
  );
}
console.log(checks + " numeric playback comparisons pass");
