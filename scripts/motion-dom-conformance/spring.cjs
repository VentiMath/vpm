"use strict";
const assert = require("node:assert/strict");
require("../motion-utils-conformance/check-controls.cjs").check();
const vpm = require("../../packages/vmotion-dom");
let checks = 0;
function near(x, y, label) {
  checks++;
  assert.ok(
    Math.abs(x - y) <= 1e-7 * Math.max(1, Math.abs(x), Math.abs(y)),
    `${label}: ${x} != ${y}`,
  );
}
const physical = [
  {},
  { stiffness: 550, damping: 30, restSpeed: 10 },
  { stiffness: 100, damping: 20 },
  { stiffness: 100, damping: 40 },
  { stiffness: 100, damping: 0 },
  { stiffness: 80, damping: 13, mass: 2, velocity: 30 },
  { stiffness: 200, damping: 10, velocity: -80 },
  { stiffness: 1, damping: 4, mass: 4, restDelta: 0.01, restSpeed: 0.01 },
];
const timing = [100, 400, 800, 1500].flatMap((duration) =>
  [0, 0.1, 0.25, 0.3, 0.5, 0.8].map((bounce) => ({ duration, bounce })),
);
for (const name of ["motion-dom", "motion-dom-app"]) {
  const control = require("../motion-utils-conformance/node_modules/" + name);
  for (const keyframes of [
    [0, 1],
    [0, 100],
    [50, -20],
    [3, 3],
  ])
    for (const options of [
      ...physical,
      ...timing,
      ...[0, 0.25, 0.5].map((bounce) => ({ visualDuration: 0.3, bounce })),
    ]) {
      const a = control.spring({ keyframes, ...options }),
        b = vpm.spring({ keyframes, ...options });
      assert.equal(a.calculatedDuration, b.calculatedDuration);
      checks++;
      for (let t = 0; t <= 2500; t += 17) {
        const x = { ...a.next(t) },
          y = { ...b.next(t) };
        near(x.value, y.value, `${name} ${JSON.stringify(options)} t=${t}`);
        near(a.velocity(t), b.velocity(t), "velocity");
        assert.equal(
          x.done,
          y.done,
          `${name} done ${JSON.stringify(options)} t=${t}`,
        );
        checks++;
      }
    }
  for (const repeatType of ["loop", "reverse", "mirror"])
    for (const options of [physical[1], { duration: 400, bounce: 0.25 }]) {
      function run(api) {
        let now = 1000,
          update;
        api.time.set(now);
        const rows = [];
        const a = api.animateValue({
          keyframes: [0, 1],
          type: "spring",
          ...options,
          repeat: 1,
          repeatType,
          repeatDelay: 0,
          delay: 30,
          driver: (fn) => (
            (update = fn),
            { now: () => now, start() {}, stop() {} }
          ),
          onUpdate: (v) => rows.push([v]),
        });
        const duration = a.duration;
        for (now = 1000; now <= 2400; now += 10) {
          api.time.set(now);
          update(now);
          rows.push([a.state]);
        }
        a.stop();
        return { duration, rows };
      }
      const a = run(control),
        b = run(vpm);
      near(a.duration, b.duration, "duration");
      assert.equal(
        a.rows.length,
        b.rows.length,
        JSON.stringify({
          name,
          repeatType,
          options,
          alen: a.rows.length,
          blen: b.rows.length,
        }),
      );
      for (let i = 0; i < a.rows.length; i++) {
        if (typeof a.rows[i][0] === "number")
          near(
            a.rows[i][0],
            b.rows[i][0],
            `playback ${name} ${repeatType} ${JSON.stringify(options)} row=${i}`,
          );
        else {
          assert.deepEqual(a.rows[i], b.rows[i]);
          checks++;
        }
      }
    }
  console.log(
    name +
      ": spring values, analytic velocity, settling and repeated playback pass",
  );
}
const current = require("../motion-utils-conformance/node_modules/motion-dom");
for (const bounce of [-1, -0.75, -0.5, -0.1])
  for (const mode of [{ duration: 800 }, { visualDuration: 0.3 }]) {
    const a = current.spring({ keyframes: [0, 100], bounce, ...mode }),
      b = vpm.spring({ keyframes: [0, 100], bounce, ...mode });
    for (let t = 0; t < 1600; t += 19) {
      near(a.next(t).value, b.next(t).value, "negative bounce");
      near(a.velocity(t), b.velocity(t), "negative bounce velocity");
    }
  }
// Current-only retarget API. This changes the origin and velocity at time zero.
const a = current.spring({ keyframes: [0, 1] }),
  b = vpm.spring({ keyframes: [0, 1] });
for (const g of [a, b]) {
  g.next(100);
  g.retarget([0.3, 2], 4);
}
for (let t = 0; t < 1200; t += 13) {
  near(a.next(t).value, b.next(t).value, "retarget");
  near(a.velocity(t), b.velocity(t), "retarget velocity");
}
// Both controls ignore visualDuration unless bounce or duration is also set.
assert.equal(
  current.spring({ keyframes: [0, 1], visualDuration: 0.3 }).next(100).value,
  current.spring({ keyframes: [0, 1] }).next(100).value,
);
near(
  vpm.spring({ keyframes: [0, 1], visualDuration: 0.3 }).next(100).value,
  current
    .spring({ keyframes: [0, 1], visualDuration: 0.3, bounce: 0.3 })
    .next(100).value,
  "standalone visualDuration fix",
);
// A repeat delay holds a settled endpoint. Controls resume sampling the curve
// in the gap and can drift outside their own rest threshold again.
function gap(api) {
  let now = 1000,
    update,
    value;
  api.time.set(now);
  const animation = api.animateValue({
    keyframes: [0, 1],
    type: "spring",
    stiffness: 550,
    damping: 30,
    restSpeed: 10,
    repeat: 1,
    repeatDelay: 50,
    delay: 30,
    driver: (fn) => ((update = fn), { now: () => now, start() {}, stop() {} }),
    onUpdate: (x) => (value = x),
  });
  update(now);
  now = 1370;
  api.time.set(now);
  update(now);
  animation.stop();
  return value;
}
near(gap(current), 0.9947520349533889, "control repeat-gap drift");
near(gap(vpm), 1, "settled repeat gap");
console.log(checks + " spring comparisons pass");
