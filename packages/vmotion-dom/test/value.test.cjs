"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
function value(initial = 0) {
  api.time.set(100);
  return api.motionValue(initial);
}
test("values, previous state, frame velocity and expiry", () => {
  const v = value(),
    seen = [];
  v.on("change", (x) => seen.push(x));
  assert.equal(v.getPrevious(), undefined);
  assert.equal(v.getVelocity(), 0);
  api.time.set(120);
  v.set(10);
  v.set(20);
  assert.equal(v.getPrevious(), 10);
  assert.equal(v.getVelocity(), 1000);
  v.set(20);
  assert.deepEqual(seen, [10, 20]);
  api.time.set(150);
  assert.equal(v.getVelocity(), 1000);
  api.time.set(151);
  assert.equal(v.getVelocity(), 0);
  v.destroy();
});
test("velocity accepts unit strings and an explicit zero delta", () => {
  const v = value("0px");
  api.time.set(110);
  v.setWithVelocity("0px", "10px", 10);
  assert.equal(v.getVelocity(), 1000);
  assert.equal(v.getPrevious(), undefined);
  v.setWithVelocity("0px", "10px", 0);
  assert.equal(v.getVelocity(), 0);
  for (const bad of [-1, NaN, Infinity])
    assert.throws(() => v.setWithVelocity("0px", "10px", bad), RangeError);
  const color = value("red");
  color.setWithVelocity("red", "blue", 16);
  assert.equal(color.getVelocity(), 0);
});
test("self-removal and stale disposers retain other subscriber lifetimes", () => {
  const v = value(),
    seen = [];
  let off;
  off = v.on("change", () => {
    seen.push("a");
    off();
  });
  const b = () => seen.push("b");
  const old = v.on("change", b);
  v.set(1);
  old();
  v.on("change", b);
  old();
  v.set(2);
  assert.deepEqual(seen, ["a", "b", "b"]);
  v.destroy();
});
test("subscription removals, deferred additions and clear during notification", () => {
  const v = value(),
    seen = [];
  const b = () => seen.push("b");
  let off;
  v.on("change", () => {
    seen.push("a");
    off();
    v.on("change", b);
  });
  off = v.on("change", () => seen.push("removed"));
  v.set(1);
  assert.deepEqual(seen, ["a"]);
  v.set(2);
  assert.deepEqual(seen, ["a", "a", "b"]);
  v.clearListeners();
  v.on("change", () => {
    v.clearListeners();
    seen.push("clear");
  });
  v.on("change", () => seen.push("wrong"));
  v.set(3);
  assert.equal(seen.at(-1), "clear");
  v.destroy();
});
test("passive effects, jump and cleanup", () => {
  const v = value(),
    seen = [];
  v.attach(
    (x, set) => set(x * 2),
    () => seen.push("stop"),
  );
  v.set(2);
  assert.equal(v.get(), 4);
  v.jump(3);
  assert.equal(v.get(), 3);
  assert.equal(v.getPrevious(), 3);
  assert.equal(v.getVelocity(), 0);
  v.set(4);
  assert.equal(v.get(), 8);
  v.destroy();
  v.destroy();
  assert.deepEqual(seen, ["stop", "stop"]);
});
test("collection, live values, dependent dirtiness and raw current reads", () => {
  const v = value(),
    seen = [];
  api.collectMotionValues.current = [];
  v.get();
  v.get();
  assert.deepEqual(api.collectMotionValues.current, [v, v]);
  api.collectMotionValues.current = undefined;
  v.animation = { stop() {}, liveValue: () => 42 };
  assert.equal(v.get(), 42);
  assert.equal(v.getCurrent(), 0);
  v.stop();
  const dependent = { dirty: () => seen.push("dirty") };
  v.addDependent(dependent);
  v.set(1);
  v.set(1);
  v.removeDependent(dependent);
  v.set(2);
  assert.deepEqual(seen, ["dirty"]);
  assert.equal(api.isMotionValue(v), true);
  assert.equal(api.isMotionValue(null), false);
});
test("asynchronous animation lifecycle and cancellation", async () => {
  const v = value(),
    seen = [];
  for (const e of ["animationStart", "animationComplete", "animationCancel"])
    v.on(e, () => seen.push(e));
  let done;
  const p = v.start((finish) => {
    done = finish;
    return { stop: () => seen.push("stop") };
  });
  assert.equal(v.isAnimating(), true);
  done();
  await p;
  assert.equal(v.isAnimating(), false);
  assert.deepEqual(seen, ["animationStart", "animationComplete"]);
  v.start(() => ({ stop: () => seen.push("stop") }));
  v.stop();
  assert.deepEqual(seen.slice(-3), [
    "animationStart",
    "stop",
    "animationCancel",
  ]);
  v.destroy();
});
test("synchronous completion emits start before completion and retains no controller", async () => {
  const v = value(),
    seen = [];
  v.on("animationStart", () => seen.push("start"));
  v.on("animationComplete", () => seen.push("complete"));
  await v.start((done) => {
    done();
    return { stop() {} };
  });
  assert.deepEqual(seen, ["start", "complete"]);
  assert.equal(v.isAnimating(), false);
});
test("late completion cannot announce success for a cancelled animation", async () => {
  const v = value(),
    seen = [];
  let done;
  v.on("animationComplete", () => seen.push("complete"));
  const a = v.start((finish) => {
    done = finish;
    return { stop() {} };
  });
  const b = { stop() {} };
  v.start(() => b);
  done();
  done();
  await a;
  assert.deepEqual(seen, []);
  assert.equal(v.animation, b);
  v.destroy();
});
test("reentrant factories and cancellation listeners preserve the new controller", () => {
  const v = value(),
    seen = [],
    inner = { stop: () => seen.push("inner") };
  v.start(() => {
    v.start(() => inner);
    return { stop: () => seen.push("discarded") };
  });
  assert.equal(v.animation, inner);
  assert.deepEqual(seen, ["discarded"]);
  v.destroy();
});
test("factory errors reject and allow a new animation", async () => {
  const v = value();
  await assert.rejects(
    v.start(() => {
      throw Error("factory");
    }),
    /factory/,
  );
  assert.equal(v.isAnimating(), false);
  await v.start((done) => {
    done();
    return undefined;
  });
  assert.equal(v.hasAnimated, true);
});
test("destroy releases listeners and effects even when controller stop throws", () => {
  const v = value(),
    seen = [];
  v.on("change", () => seen.push("change"));
  v.on("destroy", () => seen.push("destroy"));
  v.attach(
    (x, set) => set(x),
    () => seen.push("effect"),
  );
  v.start(() => ({
    stop() {
      throw Error("stop");
    },
  }));
  assert.throws(() => v.destroy(), /stop/);
  v.set(3);
  v.destroy();
  assert.deepEqual(seen, ["effect", "destroy"]);
  assert.equal(v.isAnimating(), false);
});

test("a throwing animation-start listener releases its controller", async () => {
  const v = value();
  let stops = 0;
  v.on("animationStart", () => {
    throw Error("listener");
  });
  await assert.rejects(
    v.start(() => ({
      stop() {
        stops++;
      },
    })),
    /listener/,
  );
  assert.equal(stops, 1);
  assert.equal(v.isAnimating(), false);
  v.destroy();
});
test("cancellation callbacks may start a replacement without it being cleared", () => {
  const v = value(),
    replacement = { stop() {} };
  v.start(() => ({ stop() {} }));
  const off = v.on("animationCancel", () => {
    off();
    v.start(() => replacement);
  });
  v.stop();
  assert.equal(v.animation, replacement);
  v.destroy();
});

test("explicit-velocity updates preserve attached passive effects", () => {
  const v = value(),
    seen = [];
  v.attach(
    (x, set) => {
      seen.push(x);
      set(x * 2);
    },
    () => {},
  );
  api.time.set(120);
  v.setWithVelocity(0, 10, 10);
  assert.equal(v.get(), 20);
  assert.equal(v.getVelocity(), 2000);
  assert.equal(v.getPrevious(), undefined);
  assert.deepEqual(seen, [10]);
  v.destroy();
});
