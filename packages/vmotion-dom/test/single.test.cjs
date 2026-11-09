"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
function clock() {
  let now = 1000,
    tick,
    stops = 0;
  api.time.set(now);
  return {
    driver: (fn) => (
      (tick = fn),
      {
        now: () => now,
        start() {},
        stop() {
          stops++;
        },
      }
    ),
    tick(t) {
      now = t;
      api.time.set(now);
      tick(t);
    },
    get stops() {
      return stops;
    },
  };
}
test("single numeric values deliver updates and completion", async () => {
  const c = clock(),
    values = [];
  const a = api.animateSingleValue(0, 10, {
    duration: 0.1,
    ease: "linear",
    driver: c.driver,
    onUpdate: (x) => values.push(x),
  });
  c.tick(1000);
  c.tick(1050);
  c.tick(1100);
  await a.finished;
  assert.deepEqual(values, [0, 5, 10]);
});
test("MotionValue ownership preserves lifecycle order", async () => {
  const c = clock(),
    value = api.motionValue(0),
    events = [];
  value.on("animationStart", () => events.push("start"));
  value.on("animationComplete", () => events.push("complete"));
  const a = api.animateSingleValue(value, 1, {
    duration: 0.1,
    driver: c.driver,
    onComplete: () => events.push("callback"),
  });
  c.tick(1100);
  await a.finished;
  assert.equal(value.get(), 1);
  assert.equal(value.isAnimating(), false);
  assert.deepEqual(events, ["start", "complete", "callback"]);
});
test("invalid replacements preserve the running animation", () => {
  const c = clock(),
    value = api.motionValue(0);
  const a = api.animateSingleValue(value, 10, {
    duration: 1,
    driver: c.driver,
  });
  assert.throws(() => api.animateSingleValue(value, 20, { duration: -1 }));
  assert.throws(() => api.animateSingleValue(value, 20, { repeat: -1 }));
  assert.equal(value.animation, a);
  c.tick(1500);
  assert.ok(value.get() > 0);
  value.stop();
});
test("stop settles finished and cancellation permits a fresh replay promise", async () => {
  const c = clock(),
    value = api.motionValue(0);
  const a = api.animateSingleValue(value, 1, {
    duration: 0.1,
    driver: c.driver,
  });
  const first = a.finished;
  a.cancel();
  await first;
  a.play();
  const next = a.finished;
  assert.notEqual(first, next);
  let done = false;
  next.then(() => (done = true));
  await Promise.resolve();
  assert.equal(done, false);
  c.tick(1100);
  await next;
  assert.equal(value.get(), 1);
  const b = api.animateSingleValue(0, 1, { duration: 1, driver: c.driver });
  const stopped = b.finished;
  b.stop();
  await stopped;
});
test("throwing start listeners reject finished and release the controller", async () => {
  const c = clock(),
    value = api.motionValue(0);
  value.on("animationStart", () => {
    throw Error("start listener");
  });
  const a = api.animateSingleValue(value, 1, { driver: c.driver });
  await assert.rejects(a.finished, /start listener/);
  assert.equal(value.isAnimating(), false);
  assert.equal(a.state, "idle");
  assert.ok(c.stops > 0);
});
test("throwing play and predecessor-stop callbacks clean up", () => {
  const c = clock(),
    value = api.motionValue(0);
  assert.throws(
    () =>
      api.animateSingleValue(value, 1, {
        driver: c.driver,
        onPlay() {
          throw Error("play");
        },
      }),
    /play/,
  );
  assert.equal(value.isAnimating(), false);
  const old = api.animateSingleValue(value, 1, {
    driver: c.driver,
    onStop() {
      throw Error("old stop");
    },
  });
  assert.throws(
    () => api.animateSingleValue(value, 2, { driver: c.driver }),
    /old stop/,
  );
  assert.equal(old.state, "idle");
  assert.equal(value.isAnimating(), false);
});
test("autoplay false remains paused until explicitly started", async () => {
  const c = clock(),
    value = api.motionValue(0);
  const a = api.animateSingleValue(value, 1, {
    duration: 0.1,
    autoplay: false,
    driver: c.driver,
  });
  assert.equal(a.state, "paused");
  assert.equal(value.get(), 0);
  a.play();
  c.tick(1100);
  await a;
  assert.equal(value.get(), 1);
});
test("completion listener failures reject finished, including after cancel/replay", async () => {
  for (const replay of [false, true]) {
    const c = clock(),
      value = api.motionValue(0);
    value.on("animationComplete", () => {
      throw Error("completion listener");
    });
    const a = api.animateSingleValue(value, 1, {
      duration: 0.1,
      driver: c.driver,
    });
    if (replay) {
      a.cancel();
      a.play();
    }
    const done = a.finished;
    c.tick(1100);
    await assert.rejects(done, /completion listener/);
    assert.equal(value.isAnimating(), false);
  }
});
test("falsy play failures still throw synchronously", () => {
  for (const error of [undefined, null, 0, false, ""]) {
    let caught = false;
    const value = api.motionValue(0);
    try {
      api.animateSingleValue(value, 1, {
        onPlay() {
          throw error;
        },
      });
    } catch (actual) {
      caught = true;
      assert.equal(actual, error);
    }
    assert.equal(caught, true);
    assert.equal(value.isAnimating(), false);
  }
});
test("finished read inside animationStart stays pending and preserves failure", async () => {
  for (const fail of [false, true]) {
    const c = clock(),
      value = api.motionValue(0);
    let observed,
      settled = false;
    value.on("animationStart", () => {
      observed = value.animation.finished;
      observed.then(
        () => (settled = true),
        () => {},
      );
      if (fail) throw Error("start observation");
    });
    const a = api.animateSingleValue(value, 1, {
      duration: 0.1,
      driver: c.driver,
    });
    await Promise.resolve();
    assert.equal(settled, false);
    if (fail) await assert.rejects(observed, /start observation/);
    else {
      c.tick(1100);
      await observed;
      assert.equal(value.get(), 1);
    }
    assert.equal(a.finished, observed);
  }
});

test('paused preparation preserves default easing and owns option arrays', () => {
  const value = api.motionValue(0), options = Object.freeze({delay: .1});
  const a = api.animateSingleValue(value, 1, options);
  assert.equal(a.duration, .3);
  const control = api.animateMotionValue('', api.motionValue(0), 1, options)(()=>{});
  assert.equal(a.sample(250).value, control.sample(250).value);
  a.stop();control.stop();
  const offsets=[0, .4, 1], ease=['linear','easeIn'], frames=[0, 4, 10];
  const b=api.animateSingleValue(0,frames,{times:offsets,ease,duration:1,autoplay:false});
  const before=b.sample(500).value;
  offsets[1]=.9;ease[1]='linear';frames[1]=90;
  assert.equal(b.sample(500).value,before);
  b.stop();
});

test('late finished access and replay retain independent completion lifetimes', async () => {
  const a=api.animateSingleValue(0,1,{autoplay:false});
  a.complete();
  await a.finished;
  const completed=a.finished;
  a.play();
  const replay=a.finished;
  assert.notEqual(completed,replay);
  a.stop();
  await replay;
  const b=new api.JSAnimation({keyframes:[0,1],autoplay:false});
  b.stop();
  await b.finished;
});
