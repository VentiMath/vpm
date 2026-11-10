"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
function controls(options = {}) {
  return api.animateSingleValue(0, 10, {
    duration: 1,
    ease: "linear",
    autoplay: false,
    ...options,
  });
}
test("groups snapshot members, omit undefined and forward scalar controls", async () => {
  const a = controls(),
    b = controls({ duration: 2, delay: 0.2 }),
    input = [a, undefined, b],
    g = new api.GroupAnimation(input);
  input.length = 0;
  assert.equal(g.animations.length, 2);
  g.time = 0.5;
  assert.equal(a.time, 0.5);
  assert.equal(b.time, 0.5);
  g.speed = -2;
  assert.equal(a.speed, -2);
  assert.equal(b.speed, -2);
  assert.equal(g.speed, -2);
  assert.equal(g.duration, 2);
  assert.equal(g.iterationDuration, 2.2);
  const p = g.finished;
  g.complete();
  await p;
  assert.equal(g.state, "finished");
  g.play();
  assert.notEqual(g.finished, p);
  g.pause();
  assert.equal(g.state, "paused");
  const stop = g.stop;
  stop();
  await g.finished;
});
test("empty groups have neutral controls and finish immediately", async () => {
  const g = new api.GroupAnimation([undefined]);
  assert.deepEqual(
    [g.time, g.speed, g.state, g.startTime, g.duration, g.iterationDuration],
    [0, 1, "idle", null, 0, 0],
  );
  await g.finished;
  g.play();
  g.pause();
  g.cancel();
  g.complete();
  g.stop();
  await new api.GroupAnimationWithThen([]);
});
test("group setters reject nonfinite inputs before touching members", () => {
  const a = controls(),
    b = controls(),
    g = new api.GroupAnimation([a, b]);
  assert.throws(() => (g.time = NaN), RangeError);
  assert.throws(() => (g.speed = Infinity), RangeError);
  assert.equal(a.time, 0);
  assert.equal(b.speed, 1);
  g.stop();
});
test("one failing child cannot strand another during stop or completion", () => {
  for (const method of ["play", "pause", "cancel", "complete", "stop"]) {
    const log = [],
      g = new api.GroupAnimation([
        {
          [method]() {
            log.push(1);
            throw 0;
          },
        },
        {
          [method]() {
            log.push(2);
          },
        },
      ]);
    assert.throws(
      () => g[method](),
      (e) => e === 0,
    );
    assert.deepEqual(log, [1, 2]);
  }
});
test("group promises propagate child failure, including thenable await", async () => {
  const error = Error("child failed"),
    g = new api.GroupAnimationWithThen([{ finished: Promise.reject(error) }]);
  await assert.rejects(g.finished, /child failed/);
  await assert.rejects(Promise.resolve(g), /child failed/);
  assert.equal(
    await g.then(
      () => assert.fail(),
      () => 42,
    ),
    42,
  );
});
test("group timeline disposes all observers, once, including after partial failure", () => {
  const a = controls(),
    b = controls(),
    g = new api.GroupAnimation([a, b]);
  let attached = 0,
    detached = 0;
  const cleanup = g.attachTimeline({
    observe(child) {
      attached++;
      assert.equal(child.state, "paused");
      return () => detached++;
    },
  });
  assert.equal(attached, 2);
  cleanup();
  cleanup();
  assert.equal(detached, 2);
  assert.throws(
    () =>
      g.attachTimeline({
        observe() {
          if (++attached === 4) throw Error("attach");
          return () => detached++;
        },
      }),
    /attach/,
  );
  assert.equal(detached, 3);
  g.stop();
});

test("group seek retains the requested time through a delayed controller tick", () => {
  let tick;
  const a = new api.JSAnimation({
      keyframes: [0, 10],
      duration: 1000,
      delay: 100,
      autoplay: false,
      ease: "linear",
      driver: (update) => (
        (tick = update),
        { now: () => 1000, start() {}, stop() {} }
      ),
    }),
    g = new api.GroupAnimation([a]);
  g.play();
  g.pause();
  g.time = 0.5;
  tick(1000);
  assert.equal(g.time, 0.5);
  assert.equal(a.time, 0.5);
  g.stop();
});
