"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const api = require("..");
function harness(target, options = {}, name = "opacity", initial = 0) {
  let now = 1000,
    update,
    starts = 0,
    stops = 0;
  api.time.set(now);
  const value = api.motionValue(initial);
  const factory = api.animateMotionValue(name, value, target, {
    ...options,
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
  });
  const animation = factory(() => {});
  return {
    value,
    animation,
    tick(t) {
      now = t;
      api.time.set(now);
      update(t);
      return value.get();
    },
    get starts() {
      return starts;
    },
    get stops() {
      return stops;
    },
  };
}
test("seconds, negative delay and elapsed resolve to the millisecond controller", () => {
  const h = harness(100, {
    duration: 0.2,
    ease: "linear",
    delay: 0.1,
    elapsed: 50,
  });
  assert.equal(h.animation.duration, 0.2);
  assert.equal(h.tick(1000), 0);
  assert.equal(h.tick(1100), 25);
  assert.equal(h.tick(1250), 100);
  h.animation.stop();
});
test("wildcards use from/current and previous keyframes", () => {
  const h = harness([null, null, 100], {
    from: 20,
    duration: 0.2,
    ease: "linear",
  });
  assert.equal(h.tick(1000), 20);
  assert.equal(h.tick(1100), 20);
  assert.equal(h.tick(1150), 60);
  h.animation.stop();
  const explicit = harness([10, 100], {
    from: 20,
    duration: 0.2,
    ease: "linear",
  });
  assert.equal(explicit.tick(1000), 10);
  explicit.animation.stop();
});
test("factory snapshots targets, offsets, nested easing and selected options", () => {
  let now = 1000,
    tick;
  api.time.set(now);
  const value = api.motionValue(0);
  const frames = [null, 100],
    curve = [0, 0, 1, 1],
    times = [0, 1],
    selected = {
      duration: 0.2,
      ease: [curve],
      times,
      driver: (fn) => ((tick = fn), { now: () => now, start() {}, stop() {} }),
    };
  const factory = api.animateMotionValue("opacity", value, frames, {
    opacity: selected,
  });
  frames[1] = 999;
  curve[0] = 1;
  times[1] = 0.2;
  selected.duration = 20;
  value.set(20);
  const a = factory(() => {});
  now = 1100;
  tick(now);
  assert.equal(value.get(), 60);
  assert.equal(a.duration, 0.2);
  a.stop();
});
test("calendar scale and contest opacity choose property defaults without callbacks", () => {
  const scale = api.animateMotionValue("scale", api.motionValue(0), 1, {
    delay: 0.3,
  })(() => {});
  assert.equal(scale.delay, 300);
  assert.equal(scale.isSpring, true);
  scale.stop();
  const opacity = api.animateMotionValue(
    "opacity",
    api.motionValue(0),
    1,
  )(() => {});
  assert.equal(opacity.duration, 0.3);
  assert.equal(opacity.isSpring, false);
  opacity.stop();
  const critical = api.getDefaultTransition("scale", { keyframes: [1, 0] });
  assert.equal(critical.damping, 2 * Math.sqrt(550));
  const first = api.getDefaultTransition("opacity", { keyframes: [0, 1] });
  first.ease[0] = 99;
  assert.equal(
    api.getDefaultTransition("opacity", { keyframes: [0, 1] }).ease[0],
    0.25,
  );
});
test("MotionValue owns animation lifecycle and callback order", async () => {
  const value = api.motionValue(0),
    events = [];
  let tick,
    now = 1000;
  api.time.set(now);
  value.on("animationStart", () => events.push("start"));
  value.on("animationComplete", () => events.push("complete"));
  const finished = value.start(
    api.animateMotionValue("opacity", value, 1, {
      duration: 0.1,
      ease: "linear",
      driver: (fn) => ((tick = fn), { now: () => now, start() {}, stop() {} }),
      onUpdate: (x) => {
        assert.equal(value.get(), x);
        events.push(x);
      },
      onComplete: () => events.push("callback"),
    }),
  );
  tick(now);
  now = 1100;
  tick(now);
  await finished;
  assert.deepEqual(events, ["start", 0, 1, "complete", "callback"]);
  assert.equal(value.isAnimating(), false);
});
test("stopping an adapter suppresses subsequent writes and completion", () => {
  let completed = false;
  const h = harness(100, {
    duration: 0.2,
    onComplete: () => (completed = true),
  });
  h.tick(1050);
  h.animation.stop();
  const previous = h.value.get();
  h.tick(2000);
  assert.equal(h.value.get(), previous);
  assert.equal(completed, false);
});
test("callback failure releases the driver and preserves the published value", () => {
  const h = harness(100, {
    duration: 0.2,
    ease: "linear",
    onUpdate: () => {
      throw Error("consumer");
    },
  });
  assert.throws(() => h.tick(1100), /consumer/);
  assert.equal(h.value.get(), 50);
  assert.ok(h.stops > 0);
  assert.equal(h.animation.state, "idle");
});
test("invalid and unsupported targets fail explicitly", () => {
  for (const target of [[], [0, Infinity], [0, undefined], "10px", NaN])
    assert.throws(() =>
      api.animateMotionValue("x", api.motionValue(0), target),
    );
  for (const options of [
    { duration: -1 },
    { duration: Infinity },
    { delay: NaN },
    { elapsed: Infinity },
    { repeatDelay: -1 },
    { from: "1" },
    { onUpdate: 1 },
  ])
    assert.throws(() =>
      api.animateMotionValue("x", api.motionValue(0), 1, options),
    );
  assert.throws(
    () => api.animateMotionValue("x", api.motionValue(0), 1, {}, {}),
    /not implemented/,
  );
  assert.throws(
    () => api.animateMotionValue("x", api.motionValue("0px"), 1)(() => {}),
    /finite numeric/,
  );
});
