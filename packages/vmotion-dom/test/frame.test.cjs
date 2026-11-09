"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
function harness(keep = true) {
  const queue = [],
    b = api.createRenderBatcher((fn) => queue.push(fn), keep);
  return {
    ...b,
    queue,
    tick() {
      assert.ok(queue.length);
      queue.shift()();
    },
  };
}
test("phases run in order, dedupe callbacks and use one batch request", () => {
  const h = harness(),
    seen = [];
  const phases = Object.keys(h.schedule);
  for (const phase of phases.toReversed()) {
    const f = (data) => {
      assert.equal(data, h.state);
      assert.equal(data.isProcessing, true);
      seen.push(phase);
    };
    assert.equal(h.schedule[phase](f), f);
    h.schedule[phase](f);
  }
  assert.equal(h.queue.length, 1);
  h.tick();
  assert.deepEqual(seen, phases);
  assert.equal(h.state.isProcessing, false);
  assert.equal(h.queue.length, 0);
});
test("same-phase work defers unless immediate, later phases run in this frame", () => {
  const h = harness(),
    seen = [];
  h.schedule.update(() => {
    seen.push("update");
    h.schedule.read(() => seen.push("next-read"));
    h.schedule.update(() => seen.push("next-update"));
    h.schedule.update(() => seen.push("immediate"), false, true);
    h.schedule.render(() => seen.push("render"));
  });
  h.tick();
  assert.deepEqual(seen, ["update", "immediate", "render"]);
  assert.equal(h.queue.length, 1);
  h.tick();
  assert.deepEqual(seen, [
    "update",
    "immediate",
    "render",
    "next-read",
    "next-update",
  ]);
});
test("cancellation suppresses a callback already queued in the current phase", () => {
  const h = harness(),
    seen = [];
  const later = () => seen.push("cancelled");
  h.schedule.update(() => h.cancel(later));
  h.schedule.update(later);
  h.tick();
  assert.deepEqual(seen, []);
});
test("cancel then re-register creates a new deferred lifetime", () => {
  const h = harness(),
    seen = [];
  const later = () => seen.push("later");
  h.schedule.update(() => {
    h.cancel(later);
    h.schedule.update(later);
  });
  h.schedule.update(later);
  h.tick();
  assert.deepEqual(seen, []);
  h.tick();
  assert.deepEqual(seen, ["later"]);
});
test("keep-alive stops immediately when cancelled inside its callback", () => {
  const h = harness();
  let calls = 0;
  const f = () => {
    if (++calls === 3) h.cancel(f);
  };
  h.schedule.update(f, true);
  h.tick();
  h.tick();
  h.tick();
  assert.equal(calls, 3);
  assert.equal(h.queue.length, 0);
  const noRepeat = harness(false);
  noRepeat.schedule.update(() => calls++, true);
  noRepeat.tick();
  assert.equal(noRepeat.queue.length, 0);
});
test("self-immediate rescheduling is bounded to once per phase per frame", () => {
  const h = harness();
  let calls = 0;
  const f = () => {
    if (++calls < 2) {
      h.cancel(f);
      h.schedule.update(f, false, true);
    }
  };
  h.schedule.update(f);
  h.tick();
  assert.equal(calls, 1);
  h.tick();
  assert.equal(calls, 2);
});
test("a throwing callback does not strand sibling work or poison future frames", () => {
  const h = harness(),
    seen = [],
    error = Error("frame");
  h.schedule.read(() => {
    throw error;
  });
  h.schedule.read(() => seen.push("read"));
  h.schedule.render(() => seen.push("render"));
  assert.throws(
    () => h.tick(),
    (e) => e === error,
  );
  assert.equal(h.state.isProcessing, false);
  assert.deepEqual(seen, ["read", "render"]);
  h.schedule.update(() => seen.push("next"));
  h.tick();
  assert.deepEqual(seen, ["read", "render", "next"]);
});
test("empty-frame, continuous-frame and resumed deltas are bounded", () => {
  const previous = globalThis.performance;
  let now = 100;
  globalThis.performance = { now: () => now };
  try {
    const h = harness(),
      seen = [];
    const f = (d) => seen.push(d.delta);
    h.schedule.update(f, true);
    for (const t of [100, 101, 150, 140]) {
      now = t;
      h.tick();
    }
    h.cancel(f);
    h.tick();
    assert.deepEqual(seen, [1000 / 60, 1, 40, 1]);
    now = 10000;
    h.schedule.update(f);
    h.tick();
    assert.equal(seen.at(-1), 1000 / 60);
  } finally {
    globalThis.performance = previous;
  }
});
test("step processing reentrancy does not recurse", () => {
  const h = harness();
  let calls = 0;
  h.schedule.update((data) => {
    calls++;
    h.steps.update.process(data);
  });
  h.tick();
  assert.equal(calls, 1);
});
test("microtasks coalesce phases and can be cancelled", async () => {
  const seen = [];
  const removed = () => seen.push("removed");
  api.microtask.render(() => seen.push("render"));
  api.microtask.read(() => seen.push("read"));
  api.microtask.update(removed);
  api.cancelMicrotask(removed);
  await Promise.resolve();
  assert.deepEqual(seen, ["read", "render"]);
});
test("time is stable in a synchronous turn and refreshes after a microtask", async () => {
  api.time.set(123);
  assert.equal(api.time.now(), 123);
  assert.equal(api.time.now(), 123);
  await Promise.resolve();
  assert.notEqual(api.time.now(), 123);
});
test("manual frames drive one timestamp, ignore nested processing and leave no duplicate batch", () => {
  const { createRequire } = require("node:module");
  const { MotionGlobalConfig } = createRequire(
    require.resolve(process.env.VMOTION_DOM_ENTRY || "../index.cjs"),
  )("vmotion-utils");
  const old = MotionGlobalConfig.useManualTiming;
  MotionGlobalConfig.useManualTiming = true;
  try {
    let calls = 0;
    const tick = (data) => {
      calls++;
      assert.equal(api.time.now(), data.timestamp);
      api.processFrame(999);
    };
    api.frame.update(tick, true);
    api.processFrame(500);
    assert.equal(calls, 1);
    assert.equal(api.frameData.timestamp, 500);
    api.processFrame(516);
    assert.equal(calls, 2);
    assert.equal(api.frameData.delta, 16);
    api.cancelFrame(tick);
    api.processFrame(532);
    assert.equal(calls, 2);
  } finally {
    MotionGlobalConfig.useManualTiming = old;
  }
});
test("last observer stops animation next frame, while same-frame resubscription keeps it alive", () => {
  const { createRequire } = require("node:module");
  const { MotionGlobalConfig } = createRequire(
    require.resolve(process.env.VMOTION_DOM_ENTRY || "../index.cjs"),
  )("vmotion-utils");
  const old = MotionGlobalConfig.useManualTiming;
  MotionGlobalConfig.useManualTiming = true;
  try {
    const v = api.motionValue(0);
    let stops = 0;
    v.start(() => ({
      stop() {
        stops++;
      },
    }));
    const off = v.on("change", () => {});
    off();
    const off2 = v.on("change", () => {});
    api.processFrame(600);
    assert.equal(stops, 0);
    off2();
    assert.equal(stops, 0);
    api.processFrame(616);
    assert.equal(stops, 1);
    v.destroy();
  } finally {
    MotionGlobalConfig.useManualTiming = old;
  }
});
