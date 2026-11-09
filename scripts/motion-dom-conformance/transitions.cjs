"use strict";
const assert = require("node:assert/strict");
require("../motion-utils-conformance/check-controls.cjs").check();
// Browser type guards in upstream execute even for numeric MotionValues.
global.HTMLElement ??= class {};
global.SVGElement ??= class {};
const vpm = require("../../packages/vmotion-dom");
let checks = 0;
function scenario(api, name, target, transition, initial = 0, velocity = 0) {
  const value = api.motionValue(initial),
    samples = [],
    states = [],
    events = [];
  let now = 1000,
    tick;
  api.time.set(now);
  value.setWithVelocity(initial - velocity / 100, initial, 10);
  const driver = (fn) => (
    (tick = fn),
    { now: () => now, start() {}, stop() {} }
  );
  const selected = api.getValueTransition(transition, name);
  const options = {
    ...selected,
    driver,
    onUpdate: (x) => {
      assert.equal(value.get(), x);
    },
    onComplete: () => events.push("callback"),
  };
  // Driver/callbacks count as options in upstream, so compare default selection
  // separately below; explicit property defaults are applied before the driver.
  if (!api.isTransitionDefined(selected))
    Object.assign(
      options,
      api.getDefaultTransition(name, {
        keyframes: Array.isArray(target) ? target : [null, target],
      }),
    );
  const wrapped = { ...transition, [name]: options };
  const control = api.animateMotionValue(
    name,
    value,
    target,
    wrapped,
  )(() => events.push("complete"));
  for (let t = 1000; t <= 3000; t += 13) {
    now = t;
    api.time.set(now);
    tick(t);
    samples.push(value.get());
    states.push(control.state);
  }
  control.stop();
  return { samples, states, events, duration: control.duration };
}
for (const packageName of ["motion-dom", "motion-dom-app"]) {
  const control = require(
    "../motion-utils-conformance/node_modules/" + packageName,
  );
  const tolerance = packageName.endsWith("app") ? 0.06 : 0.0002;
  for (const name of [
    "opacity",
    "width",
    "x",
    "scale",
    "scaleX",
    "rotate",
    "originX",
    "skewY",
    "scaleFoo",
  ])
    for (const frames of [
      [0, 1],
      [1, 0],
      [0, 0.5, 1],
    ]) {
      assert.deepEqual(
        vpm.getDefaultTransition(name, { keyframes: frames }),
        control.getDefaultTransition(name, { keyframes: frames }),
      );
      checks++;
    }
  for (const key of [
    "when",
    "delay",
    "delayChildren",
    "staggerChildren",
    "staggerDirection",
    "repeat",
    "repeatType",
    "repeatDelay",
    "from",
    "elapsed",
    "duration",
    "ease",
    "type",
    "onUpdate",
    "driver",
    "velocity",
    "foo",
  ])
    for (const value of [undefined, 0, 1]) {
      assert.equal(
        vpm.isTransitionDefined({ [key]: value }),
        control.isTransitionDefined({ [key]: value }),
      );
      checks++;
    }
  for (const transition of [
    { duration: 0.2 },
    { default: { duration: 0.3 }, delay: 0.1 },
    { opacity: { duration: 0.4 }, duration: 0.2 },
  ])
    for (const name of ["opacity", "x"]) {
      assert.equal(
        vpm.getValueTransition(transition, name),
        control.getValueTransition(transition, name),
      );
      checks++;
    }
  for (const name of ["opacity", "scale", "x"])
    for (const target of [
      1,
      [1],
      [null, 1],
      [null, null, 1],
      [0, 0.5, 1],
      [1, 0],
    ])
      for (const transition of [
        {},
        { duration: 0.2, ease: "linear" },
        { duration: 0.3, delay: 0.1, elapsed: 25 },
        { duration: 0.2, repeat: 2, repeatDelay: 0.05, repeatType: "reverse" },
        { from: 0.25, duration: 0.3 },
        { type: false, delay: 0.05 },
        {
          delay: 0.15,
          default: { duration: 0.2, delay: 0.05, ease: "linear" },
        },
      ]) {
        const a = scenario(control, name, target, transition),
          b = scenario(vpm, name, target, transition);
        for (let i = 0; i < a.samples.length; i++) {
          // Existing documented VPM playback behavior: a non-repeating physical
          // spring stops on the first frame satisfying BOTH rest thresholds.
          // Upstream waits for its 50ms duration estimate and can move again.
          if (
            name === "x" &&
            !Object.keys(transition).length &&
            b.states[i] === "finished"
          ) {
            assert.equal(
              b.samples[i],
              Array.isArray(target) ? target.at(-1) : target,
            );
            checks++;
            continue;
          }
          assert.ok(
            Math.abs(a.samples[i] - b.samples[i]) <= tolerance,
            `${packageName} ${name} ${JSON.stringify(target)} ${JSON.stringify(transition)} sample ${i}: ${a.samples[i]} != ${b.samples[i]}`,
          );
          checks++;
        }
        assert.deepEqual(a.events, b.events);
        assert.equal(a.duration, b.duration);
        checks += 2;
      }
  for (const velocity of [-10, 20]) {
    const options = {
      type: "spring",
      stiffness: 550,
      damping: 30,
      restDelta: 1e-10,
      restSpeed: 1e-10,
    };
    const a = scenario(control, "scale", 1, options, 0.2, velocity),
      b = scenario(vpm, "scale", 1, options, 0.2, velocity);
    for (let i = 0; i < a.samples.length; i++) {
      assert.ok(
        Math.abs(a.samples[i] - b.samples[i]) <= tolerance,
        `${packageName} velocity ${velocity}, ${i}: ${a.samples[i]} != ${b.samples[i]}`,
      );
      checks++;
    }
  }
  console.log(
    packageName +
      ": numeric transition defaults, wildcards, seconds, delays, repeats and velocity pass",
  );
}
console.log(checks + " numeric transition comparisons pass");
