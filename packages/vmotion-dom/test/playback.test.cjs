"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
function harness(options = {}) {
  let now = 1000,
    update,
    starts = 0,
    stops = 0;
  const values = [],
    events = [];
  const animation = api.animateValue({
    keyframes: [0, 100],
    duration: 100,
    ease: "linear",
    onUpdate: (x) => values.push(x),
    onPlay: () => events.push("play"),
    onComplete: () => events.push("complete"),
    onStop: () => events.push("stop"),
    driver: (fn) => (
      (update = fn),
      {
        now: () => now,
        start() {
          starts++;
        },
        stop() {
          stops++;
        },
      }
    ),
    ...options,
  });
  return {
    animation,
    values,
    events,
    tick(t) {
      now = t;
      update(t);
      return values.at(-1);
    },
    get starts() {
      return starts;
    },
    get stops() {
      return stops;
    },
  };
}
test("numeric generator uses explicit offsets, easing and owned snapshots", () => {
  const keys = [0, 10, 30],
    times = [0, 0.25, 1],
    ease = [(p) => p * p, (p) => p];
  const g = api.keyframes({ keyframes: keys, times, ease, duration: 400 });
  keys.fill(99);
  times.fill(0);
  ease[0] = () => 0;
  assert.equal(g.next(50).value, 2.5);
  assert.equal(g.next(250).value, 20);
  assert.deepEqual(g.next(400), { done: true, value: 30 });
  assert.equal(g.next(0).value, 0);
});
test("single keyframes, zero duration and clamped samples", () => {
  assert.deepEqual(api.keyframes({ keyframes: [7] }).next(500), {
    done: true,
    value: 7,
  });
  const g = api.keyframes({ keyframes: [0, 10], duration: 0 });
  assert.deepEqual(g.next(0), { done: true, value: 10 });
  assert.equal(
    api.keyframes({ keyframes: [0, 10], ease: "linear" }).next(-1).value,
    0,
  );
});
test("invalid keyframes, offsets, timings and unsupported physics reject", () => {
  for (const keyframes of [[], [0, NaN], [0, Infinity], [0, "1"], new Array(2)])
    assert.throws(() => api.animateValue({ keyframes }), Error);
  for (const opts of [
    { duration: -1 },
    { duration: Infinity },
    { delay: NaN },
    { repeat: 0.5 },
    { repeat: -1 },
    { repeatDelay: -1 },
    { repeatType: "bad" },
    { type: "inertia" },
    { duration: 0, repeat: Infinity },
    { finalKeyframe: Infinity },
    { onUpdate: 1 },
    { times: [0, 0.5] },
    { times: [0] },
    { ease: ["linear", "linear"] },
  ])
    assert.throws(
      () => api.animateValue({ keyframes: [0, 1], ...opts }),
      Error,
    );
});
test("default driver is not started for autoplay false", () => {
  const h = harness({ autoplay: false });
  assert.equal(h.animation.state, "paused");
  assert.equal(h.starts, 0);
  h.animation.play();
  h.animation.play();
  assert.equal(h.starts, 1);
  h.animation.stop();
});
test("linear playback, lifecycle and finished promise", async () => {
  const h = harness();
  const promise = h.animation.finished;
  assert.equal(h.tick(1000), 0);
  assert.equal(h.tick(1025), 25);
  assert.equal(h.tick(1100), 100);
  assert.equal(h.animation.state, "finished");
  await promise;
  assert.deepEqual(h.events, ["play", "complete"]);
  h.tick(1120);
  assert.equal(h.values.length, 3);
  h.animation.complete();
  assert.deepEqual(h.events, ["play", "complete"]);
});
test("delay, negative delay and boundary completion", () => {
  const h = harness({ delay: 50 });
  assert.ok(Math.abs(h.animation.iterationDuration - 0.15) < Number.EPSILON);
  for (const [t, v] of [
    [1000, 0],
    [1049, 0],
    [1050, 0],
    [1075, 25],
    [1150, 100],
  ])
    assert.equal(h.tick(t), v);
  const n = harness({ delay: -25 });
  assert.equal(n.tick(1000), 25);
  assert.equal(n.tick(1075), 100);
});
test("repeat loop, reverse and mirror distinguish easing direction", () => {
  for (const [repeatType, expected] of [
    ["loop", 6.25],
    ["reverse", 56.25],
    ["mirror", 93.75],
  ]) {
    const h = harness({
      repeat: 1,
      repeatType,
      repeatDelay: 20,
      ease: (p) => p * p,
    });
    assert.equal(h.tick(1100), 100);
    assert.equal(h.animation.state, "running");
    assert.equal(h.tick(1120), 100);
    assert.equal(h.tick(1145), expected);
    assert.equal(h.tick(1220), repeatType === "loop" ? 100 : 0);
    assert.equal(h.animation.state, "finished");
  }
});
test("pause/resume keeps elapsed delay and removes scheduled work", () => {
  const h = harness({ delay: 50 });
  h.tick(1075);
  h.animation.pause();
  assert.equal(h.stops, 1);
  assert.equal(h.animation.time, 0.025);
  h.tick(1175);
  assert.equal(h.values.at(-1), 25);
  h.animation.play();
  assert.equal(h.tick(1200), 50);
  h.animation.stop();
});
test("speed changes including zero and reverse preserve continuity with delay", () => {
  const h = harness({ delay: 50 });
  h.tick(1100);
  h.animation.speed = 0;
  h.tick(1200);
  assert.equal(h.values.at(-1), 50);
  h.animation.speed = 2;
  assert.equal(h.tick(1210), 70);
  h.animation.speed = -1;
  assert.equal(h.tick(1220), 60);
  assert.equal(h.tick(1280), 0);
  assert.equal(h.animation.state, "finished");
});
test("seeking updates immediately and reanchors both running and paused playback", () => {
  const h = harness({ delay: 50 });
  h.tick(1000);
  h.animation.time = 0.05;
  assert.equal(h.values.at(-1), 50);
  assert.equal(h.tick(1010), 60);
  h.animation.pause();
  h.animation.time = 0.025;
  assert.equal(h.values.at(-1), 25);
  h.tick(1100);
  h.animation.play();
  assert.equal(h.tick(1110), 35);
  h.animation.stop();
});
test("cancel restores the first value even with negative delay and can replay", async () => {
  const h = harness({ delay: -25 });
  h.tick(1025);
  const p = h.animation.finished;
  h.animation.cancel();
  assert.equal(h.values.at(-1), 0);
  assert.equal(h.animation.state, "idle");
  await p;
  h.animation.play();
  assert.notEqual(h.animation.finished, p);
  assert.equal(h.tick(1025), 25);
  h.animation.stop();
});
test("stop is bound, idempotent and terminal", async () => {
  const h = harness();
  h.tick(1025);
  const stop = h.animation.stop;
  stop();
  stop();
  h.animation.play();
  h.tick(1200);
  await h.animation.finished;
  assert.equal(h.values.at(-1), 25);
  assert.equal(h.events.filter((x) => x === "stop").length, 1);
  assert.equal(h.animation.state, "idle");
});
test("completion is immediate, repeat-aware and replay creates a fresh promise", async () => {
  const h = harness({ repeat: 1, repeatType: "reverse", delay: 50 });
  const p = h.animation.finished;
  h.animation.complete();
  assert.equal(h.values.at(-1), 0);
  await p;
  assert.equal(h.events.at(-1), "complete");
  h.animation.play();
  assert.notEqual(p, h.animation.finished);
  h.animation.stop();
  const infinite = harness({ repeat: Infinity });
  infinite.animation.complete();
  assert.equal(infinite.values.at(-1), 100);
});
test("zero-duration finite repeats complete without spinning", () => {
  const h = harness({ duration: 0, repeat: 2 });
  assert.equal(h.tick(1000), 100);
  assert.equal(h.animation.state, "finished");
  const disabled = harness({ type: false, duration: 100 });
  assert.equal(disabled.tick(1000), 100);
});
test("pure sampling leaves position, lifecycle and subscribers alone", () => {
  const h = harness({ delay: 50 });
  h.tick(1075);
  const state = [h.animation.time, h.animation.state, h.values.length];
  assert.equal(h.animation.sampleAt(1125), 75);
  assert.deepEqual(
    [h.animation.time, h.animation.state, h.values.length],
    state,
  );
  h.animation.stop();
});
test("final keyframe is applied only at completion, resolved samples keep numeric endpoint", () => {
  const h = harness({ finalKeyframe: 99 });
  assert.equal(h.animation.sampleAt(1200, true), 100);
  assert.equal(h.tick(1100), 99);
});
test("throwing update and play hooks stop their driver and release promises", async () => {
  const h = harness({
    onUpdate() {
      throw Error("update");
    },
  });
  assert.throws(() => h.tick(1000), /update/);
  assert.equal(h.stops, 1);
  await h.animation.finished;
  assert.equal(h.animation.state, "idle");
  let stopped = 0;
  assert.throws(
    () =>
      api.animateValue({
        keyframes: [0, 1],
        onPlay() {
          throw Error("play");
        },
        driver: () => ({
          now: () => 0,
          start() {},
          stop() {
            stopped++;
          },
        }),
      }),
    /play/,
  );
  assert.equal(stopped, 1);
});
test("throwing completion and stop hooks leave no active driver", async () => {
  const h = harness({
    onComplete() {
      throw Error("complete");
    },
  });
  assert.throws(() => h.tick(1100), /complete/);
  assert.equal(h.stops, 1);
  await h.animation.finished;
  const s = harness({
    onStop() {
      throw Error("stop");
    },
  });
  assert.throws(() => s.animation.stop(), /stop/);
  assert.equal(s.stops, 1);
  await s.animation.finished;
});
test("callbacks that cancel or pause the final tick cannot emit false completion", () => {
  let a;
  const h = harness({
    onUpdate() {
      a.cancel();
    },
  });
  a = h.animation;
  h.tick(1100);
  assert.equal(a.state, "idle");
  assert.ok(!h.events.includes("complete"));
  let b;
  const p = harness({
    onUpdate() {
      b.pause();
    },
  });
  b = p.animation;
  p.tick(1100);
  assert.equal(b.state, "paused");
  assert.ok(!p.events.includes("complete"));
  b.stop();
});
test("recursive complete/cancel hooks remain bounded", () => {
  let a,
    count = 0;
  const h = harness({
    onUpdate() {
      count++;
      a.complete();
    },
  });
  a = h.animation;
  a.complete();
  assert.equal(count, 1);
  let b,
    cancels = 0;
  const c = harness({
    onUpdate() {
      cancels++;
      b.cancel();
    },
  });
  b = c.animation;
  b.cancel();
  assert.equal(cancels, 1);
});
test("MotionValue animation ownership completes through the VPM playback engine", async () => {
  const value = api.motionValue(0),
    events = [];
  value.on("animationComplete", () => events.push("complete"));
  let tick;
  const done = value.start((finish) =>
    api.animateValue({
      keyframes: [0, 1],
      duration: 100,
      ease: "linear",
      onUpdate: (x) => value.set(x),
      onComplete: finish,
      driver: (f) => ((tick = f), { now: () => 1000, start() {}, stop() {} }),
    }),
  );
  tick(1050);
  assert.equal(value.get(), 0.5);
  tick(1100);
  await done;
  assert.equal(value.get(), 1);
  assert.equal(value.isAnimating(), false);
  assert.deepEqual(events, ["complete"]);
  value.destroy();
});

test("an overflowing seek rejects before changing the playback position", () => {
  const h = harness();
  h.tick(1025);
  assert.throws(() => {
    h.animation.time = Number.MAX_VALUE;
  }, RangeError);
  assert.equal(h.animation.time, 0.025);
  assert.equal(h.tick(1050), 50);
  h.animation.stop();
});

test("pure samples do not overwrite the last delivered frame result", () => {
  const h = harness();
  const last = h.animation.tick(1025);
  assert.equal(last.value, 25);
  assert.equal(h.animation.sampleAt(1075), 75);
  assert.equal(last.value, 25);
  h.animation.stop();
});
