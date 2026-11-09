"use strict";
const assert = require("node:assert/strict");
require("../motion-utils-conformance/check-controls.cjs").check();
const vpm = require("../../packages/vmotion-dom/index.cjs");
let checks = 0;
function near(a, b) {
  checks++;
  if (typeof a === "number" && typeof b === "number")
    assert.ok(
      Object.is(a, b) ||
        (Number.isNaN(a) && Number.isNaN(b)) ||
        Math.abs(a - b) < 1e-8,
      `${a} != ${b}`,
    );
  else assert.deepEqual(a, b);
}
function trace(api, initial, stringValues) {
  api.time.set(100);
  const value = api.motionValue(initial),
    seen = [],
    rows = [];
  const off = value.on("change", (v) => seen.push(v));
  for (let i = 0; i < 100; i++) {
    api.time.set(120 + i * 16);
    const next = (i * 37) % 101;
    value.set(stringValues ? next + "px" : next);
    value.set(stringValues ? next + 1 + "px" : next + 1);
    rows.push([value.get(), value.getPrevious(), value.getVelocity()]);
  }
  off();
  value.set(stringValues ? "10px" : 10);
  value.jump(stringValues ? "2px" : 2);
  rows.push([value.get(), value.getPrevious(), value.getVelocity()]);
  value.destroy();
  return { rows, seen };
}
function scheduler(api) {
  const queue = [],
    seen = [],
    batch = api.createRenderBatcher((fn) => queue.push(fn), true);
  let repeats = 0;
  const repeat = () => {
    seen.push("keep");
    if (++repeats === 3) batch.cancel(repeat);
  };
  batch.schedule.read(repeat, true);
  batch.schedule.update(() => {
    seen.push("update");
    batch.schedule.read(() => seen.push("next-read"));
    batch.schedule.update(() => seen.push("deferred"));
    batch.schedule.update(() => seen.push("immediate"), false, true);
    batch.schedule.render(() => seen.push("late-render"));
  });
  batch.schedule.render(() => seen.push("render"));
  for (let i = 0; queue.length && i < 10; i++) queue.shift()();
  assert.equal(queue.length, 0);
  return seen;
}
async function lifecycle(api) {
  const value = api.motionValue(0),
    seen = [];
  for (const name of [
    "animationStart",
    "animationComplete",
    "animationCancel",
    "destroy",
  ])
    value.on(name, () => seen.push(name));
  let finish;
  const p = value.start((done) => {
    finish = done;
    return {
      stop() {
        seen.push("stop");
      },
    };
  });
  assert.equal(value.isAnimating(), true);
  finish();
  await p;
  assert.equal(value.isAnimating(), false);
  value.start(() => ({
    stop() {
      seen.push("stop");
    },
  }));
  value.stop();
  value.destroy();
  return seen;
}
(async () => {
  for (const name of ["motion-dom", "motion-dom-app"]) {
    const control = require("../motion-utils-conformance/node_modules/" + name);
    for (const [initial, stringValues] of [
      [0, false],
      ["0px", true],
      [undefined, false],
      ["red", false],
    ]) {
      const a = trace(control, initial, stringValues),
        b = trace(vpm, initial, stringValues);
      near(a.seen, b.seen);
      for (let i = 0; i < a.rows.length; i++)
        for (let j = 0; j < 3; j++) near(a.rows[i][j], b.rows[i][j]);
    }
    for (const delta of [0, 1, 10, 16, 30, 100]) {
      control.time.set(100);
      vpm.time.set(100);
      const a = control.motionValue(0),
        b = vpm.motionValue(0);
      control.time.set(120);
      vpm.time.set(120);
      a.setWithVelocity(0, 10, delta);
      b.setWithVelocity(0, 10, delta);
      near(a.getVelocity(), b.getVelocity());
      near(a.getPrevious(), b.getPrevious());
      a.destroy();
      b.destroy();
    }
    function passive(api) {
      api.time.set(100);
      const value = api.motionValue(0),
        seen = [];
      value.attach(
        (next, set) => {
          seen.push(next);
          set(next * 2);
        },
        () => {},
      );
      api.time.set(120);
      value.setWithVelocity(0, 10, 10);
      const result = [
        value.get(),
        value.getPrevious(),
        value.getVelocity(),
        seen,
      ];
      value.destroy();
      return result;
    }
    near(passive(control), passive(vpm));
    near(scheduler(control), scheduler(vpm));
    near(await lifecycle(control), await lifecycle(vpm));
    console.log(name, "value and scheduler contracts pass");
  }
  function manual(api, entry) {
    const { createRequire } = require("node:module");
    const { MotionGlobalConfig } = createRequire(require.resolve(entry))(
      api === vpm ? "vmotion-utils" : "motion-utils",
    );
    const prior = MotionGlobalConfig.useManualTiming;
    MotionGlobalConfig.useManualTiming = true;
    const rows = [],
      value = api.motionValue(0),
      callback = (data) => {
        value.set(data.timestamp);
        rows.push([data.timestamp, data.delta, value.get()]);
      };
    try {
      api.frame.update(callback, true);
      for (const t of [100, 116, 132]) api.processFrame(t);
    } finally {
      api.cancelFrame(callback);
      value.destroy();
      MotionGlobalConfig.useManualTiming = prior;
    }
    return rows;
  }
  const currentControl = require("../motion-utils-conformance/node_modules/motion-dom");
  near(
    manual(
      currentControl,
      "../motion-utils-conformance/node_modules/motion-dom",
    ),
    manual(vpm, "../../packages/vmotion-dom/index.cjs"),
  );
  // These behavioral differences are intentional and reproduced on the current control.
  const current = require("../motion-utils-conformance/node_modules/motion-dom");
  function cancelled(api) {
    let run;
    const b = api.createRenderBatcher((cb) => (run = cb), true),
      seen = [];
    const second = () => seen.push("cancelled");
    b.schedule.update(() => b.cancel(second));
    b.schedule.update(second);
    run();
    return seen;
  }
  near(cancelled(current), ["cancelled"]);
  near(cancelled(vpm), []);
  function thrown(api) {
    let run;
    const b = api.createRenderBatcher((cb) => (run = cb), true);
    b.schedule.update(() => {
      throw Error("callback");
    });
    assert.throws(() => run(), /callback/);
    return b.state.isProcessing;
  }
  near(thrown(current), true);
  near(thrown(vpm), false);
  console.log(
    checks,
    "value/lifecycle/scheduler comparisons including explicit corrected-control regressions pass",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
