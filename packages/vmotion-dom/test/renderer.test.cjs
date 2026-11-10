"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
function owner(extra = {}) {
  return {
    current: {
      nodeType: 1,
      style: {},
      ownerDocument: {
        defaultView: {
          getComputedStyle: () => ({
            getPropertyValue: (k) => (k === "--end" ? "40px" : ""),
            width: "20px",
          }),
        },
      },
    },
    getProps: () => ({}),
    ...extra,
  };
}
function tokenResolver(Base = api.KeyframeResolver, asynchronous = false) {
  return class extends Base {
    constructor(...args) {
      super(...args);
      if (asynchronous) this.isAsync = true;
    }
    readKeyframes() {
      this.unresolvedKeyframes = this.unresolvedKeyframes.map((v) =>
        v === "unit" ? 20 : v,
      );
      super.readKeyframes();
    }
  };
}
test("renderer adapter owns no second MotionValue lifecycle and resolves CSS endpoints", async () => {
  const value = api.motionValue("20px"),
    events = [],
    element = owner();
  value.on("animationStart", () => events.push("start"));
  value.on("animationComplete", () => events.push("complete"));
  const finished = value.start(
    api.animateMotionValue(
      "width",
      value,
      "var(--end)",
      {
        duration: 1,
        ease: "linear",
        autoplay: false,
        onComplete: () => events.push("callback"),
      },
      element,
    ),
  );
  const animation = value.animation;
  assert.deepEqual(events, ["start"]);
  animation.time = 0.5;
  assert.equal(value.get(), 30);
  animation.complete();
  await finished;
  await animation.finished;
  assert.equal(value.get(), "var(--end)");
  assert.deepEqual(events, ["start", "complete", "callback"]);
});
test("custom sync and async resolution preserves supplied frames and supports lifecycle completion", async () => {
  for (const async of [false, true]) {
    const value = api.motionValue(0),
      element = owner({ KeyframeResolver: tokenResolver(undefined, async) });
    const finished = value.start(
        api.animateMotionValue(
          "x",
          value,
          "unit",
          { duration: 1, ease: "linear", autoplay: false },
          element,
        ),
      ),
      a = value.animation;
    a.time = 0.5;
    assert.equal(value.get(), 10);
    a.complete();
    await finished;
    await a.finished;
  }
});
test("factories snapshot inputs once and can be started repeatedly with fresh origins", () => {
  const frames = [null, "unit"],
    ease = [0, 0, 1, 1],
    options = { duration: 1, ease, autoplay: false },
    value = api.motionValue(0),
    element = owner({ KeyframeResolver: tokenResolver() });
  const factory = api.animateMotionValue("x", value, frames, options, element);
  frames[1] = "bad";
  options.duration = 10;
  ease.fill(4);
  const a = factory(() => {});
  a.time = 0.5;
  assert.ok(Math.abs(value.get() - 10) < 1e-7);
  a.stop();
  value.set(10);
  const b = factory(() => {});
  b.time = 0.5;
  assert.ok(Math.abs(value.get() - 15) < 1e-7);
  b.stop();
});
test("custom resolver output belongs to its producer, including frozen output", () => {
  const result = Object.freeze(["0px", "20px"]);
  class R extends api.KeyframeResolver {
    constructor(frames, done, ...rest) {
      super(frames, () => done(result, undefined, false), ...rest);
    }
  }
  const value = api.motionValue("0px"),
    a = api.animateMotionValue(
      "x",
      value,
      "unit",
      { duration: 1, ease: "linear", autoplay: false },
      owner({ KeyframeResolver: R }),
    )(() => {});
  a.time = 0.5;
  assert.equal(value.get(), "10px");
  assert.deepEqual(result, ["0px", "20px"]);
  a.stop();
});
test("pending cancellation can replay; stop suppresses late custom completion", async () => {
  const value = api.motionValue(0),
    element = owner({ KeyframeResolver: tokenResolver(undefined, true) }),
    a = api.animateMotionValue(
      "x",
      value,
      "unit",
      { duration: 1, ease: "linear", autoplay: false },
      element,
    )(() => {});
  const first = a.finished;
  a.cancel();
  await first;
  api.flushKeyframeResolvers();
  assert.equal(value.get(), 0);
  a.play();
  a.pause();
  a.time = 0.5;
  assert.equal(value.get(), 10);
  a.stop();
  await a.finished;
  let callback;
  class Late extends api.KeyframeResolver {
    constructor(frames, done, ...rest) {
      super(frames, done, ...rest);
      callback = done;
    }
    scheduleResolve() {
      this.state = "scheduled";
    }
  }
  const b = api.animateMotionValue(
    "x",
    value,
    30,
    {},
    owner({ KeyframeResolver: Late }),
  )(() => assert.fail("stopped completion"));
  b.stop();
  callback([10, 30]);
  assert.equal(value.get(), 10);
  await b.finished;
});
test("custom resolver failures reject pending finished and do not strand other animations", async () => {
  class Bad extends api.KeyframeResolver {
    constructor(...args) {
      super(...args);
      this.isAsync = true;
    }
    readKeyframes() {
      throw 0;
    }
  }
  const value = api.motionValue(0),
    bad = api.animateMotionValue(
      "x",
      value,
      10,
      {},
      owner({ KeyframeResolver: Bad }),
    )(() => {}),
    p = assert.rejects(bad.finished, (e) => e === 0),
    good = api.animateMotionValue(
      "x",
      api.motionValue(0),
      20,
      { autoplay: false },
      owner(),
    )(() => {});
  assert.throws(
    () => api.flushKeyframeResolvers(),
    (e) => e === 0,
  );
  await p;
  assert.ok(good.duration > 0);
  good.stop();
});
test("custom resolver receives full owner context through animateElement", () => {
  const values = new Map(),
    o = owner({
      getValue: (k) => values.get(k),
      addValue: (k, v) => values.set(k, v),
      removeValue: (k) => values.delete(k),
    });
  let calls = 0;
  class R extends api.KeyframeResolver {
    readKeyframes() {
      assert.equal(this.element, o);
      assert.equal(this.element.current, o.current);
      assert.equal(this.element.getValue("x"), values.get("x"));
      calls++;
      this.unresolvedKeyframes = [0, 20];
    }
  }
  o.KeyframeResolver = R;
  const [a] = api.animateElement(
    o.current,
    { x: "unit" },
    { duration: 1, ease: "linear", autoplay: false },
    o,
  );
  a.time = 0.5;
  assert.equal(values.get("x").get(), 10);
  assert.equal(calls, 1);
  a.stop();
});
test("renderer flags skip transforms selectively; handoff bypasses custom DOM resolution", () => {
  let calls = 0;
  class R extends api.KeyframeResolver {
    readKeyframes() {
      calls++;
      super.readKeyframes();
    }
  }
  const element = owner({ KeyframeResolver: R, shouldReduceMotion: true }),
    v = api.motionValue(0),
    a = api.animateMotionValue(
      "x",
      v,
      10,
      { duration: 1, autoplay: false },
      element,
    )(() => {});
  assert.equal(a.duration, 0);
  a.stop();
  const b = api.animateMotionValue(
    "opacity",
    v,
    1,
    { duration: 1, autoplay: false },
    element,
  )(() => {});
  assert.equal(b.duration, 1);
  b.stop();
  const reads = calls,
    c = api.animateMotionValue(
      "x",
      v,
      [0, 20],
      { duration: 1, ease: "linear", autoplay: false },
      owner({ KeyframeResolver: R }),
      true,
    )(() => {});
  c.time = 0.5;
  assert.equal(v.get(), 10);
  assert.equal(calls, reads);
  c.stop();
});
test("custom measurement errors restore styles and preserve unrelated queued resolution", async () => {
  const element = owner(),
    value = api.motionValue(0);
  let restored = 0;
  class R extends api.KeyframeResolver {
    constructor(...args) {
      super(...args);
      this.isAsync = true;
    }
    readKeyframes() {
      super.readKeyframes();
      this.needsMeasurement = true;
    }
    prepareMeasurement() {
      this.element.current.style.width = "temporary";
    }
    measureEndState() {
      throw Error("measurement");
    }
    restore() {
      delete this.element.current.style.width;
      restored++;
    }
  }
  const a = api.animateMotionValue(
      "x",
      value,
      10,
      {},
      { ...element, KeyframeResolver: R },
    )(() => {}),
    p = assert.rejects(a.finished, /measurement/);
  assert.throws(() => api.flushKeyframeResolvers(), /measurement/);
  await p;
  assert.equal(restored, 1);
  assert.equal(element.current.style.width, undefined);
});
test("a start listener may synchronously complete a renderer-aware controller", async () => {
  const v = api.motionValue(0),
    events = [];
  v.on("animationStart", () => {
    events.push("start");
    v.animation.complete();
  });
  v.on("animationComplete", () => events.push("end"));
  await v.start(api.animateMotionValue("x", v, 10, { duration: 1 }, owner()));
  assert.equal(v.get(), 10);
  assert.deepEqual(events, ["start", "end"]);
});
test("instance-field resolver failures reject both controller and owned lifecycle", async () => {
  class Broken extends api.KeyframeResolver {
    constructor(...args) {
      super(...args);
      this.isAsync = true;
    }
    readKeyframes = () => {
      throw Error("instance read");
    };
  }
  const v = api.motionValue(0),
    life = v.start(
      api.animateMotionValue(
        "x",
        v,
        10,
        {},
        owner({ KeyframeResolver: Broken }),
      ),
    ),
    a = v.animation;
  const failures = Promise.all([
    assert.rejects(life, /instance read/),
    assert.rejects(a.finished, /instance read/),
  ]);
  assert.throws(() => api.flushKeyframeResolvers(), /instance read/);
  await failures;
  assert.equal(v.isAnimating(), false);
});
test("foreign-style measurement rendering failures restore values and reject", async () => {
  class R extends api.KeyframeResolver {
    constructor(...args) {
      super(...args);
      this.isAsync = true;
    }
    readKeyframes() {
      super.readKeyframes();
      this.needsMeasurement = true;
    }
    measureInitialState() {
      this.motionValue.set(100);
    }
  }
  const v = api.motionValue(0),
    e = owner({
      KeyframeResolver: R,
      render() {
        throw Error("paint failure");
      },
    }),
    a = api.animateMotionValue("x", v, 10, {}, e)(() => {}),
    p = assert.rejects(a.finished, /paint failure/);
  assert.throws(() => api.flushKeyframeResolvers(), /paint failure/);
  await p;
  assert.equal(v.get(), 0);
});
test("instance-field measurement hooks retain framework rendering and restoration", async () => {
  let paints = 0,
    restores = 0;
  const v = api.motionValue(0),
    element = owner({ render: () => paints++ });
  class R extends api.KeyframeResolver {
    constructor(...args) {
      super(...args);
      this.isAsync = true;
    }
    readKeyframes() {
      super.readKeyframes();
      this.needsMeasurement = true;
    }
    measureInitialState() {
      this.motionValue.set(100);
    }
    renderEndStyles = () => {};
    measureEndState() {
      throw Error("end");
    }
    restore = () => {
      restores++;
    };
  }
  const a = api.animateMotionValue(
      "x",
      v,
      10,
      {},
      { ...element, KeyframeResolver: R },
    )(() => {}),
    p = assert.rejects(a.finished, /end/);
  assert.throws(() => api.flushKeyframeResolvers(), /end/);
  await p;
  assert.equal(v.get(), 0);
  assert.equal(paints, 1);
  assert.equal(restores, 1);
});

test("forced completion flags survive custom resolver guards", () => {
  let forced;
  class R extends api.KeyframeResolver {
    constructor(...args) {
      super(...args);
      this.isAsync = true;
    }
    complete(flag) {
      forced = flag;
      super.complete(flag);
    }
  }
  const a = api.animateMotionValue(
    "x",
    api.motionValue(0),
    10,
    { autoplay: false },
    owner({ KeyframeResolver: R }),
  )(() => {});
  void a.duration;
  assert.equal(forced, true);
  a.stop();
});

test("cached resolver guards keep failure ownership local to each instance", async () => {
  class R extends api.KeyframeResolver {
    constructor(...args) {
      super(...args);
      this.isAsync = true;
    }
    readKeyframes() {
      if (this.element.broken) throw Error("only this owner");
      super.readKeyframes();
    }
  }
  const badValue = api.motionValue(0),
    goodValue = api.motionValue(0);
  const bad = badValue.start(
    api.animateMotionValue(
      "x",
      badValue,
      10,
      {},
      owner({ KeyframeResolver: R, broken: true }),
    ),
  );
  const rejected = assert.rejects(bad, /only this owner/);
  goodValue.start(
    api.animateMotionValue(
      "x",
      goodValue,
      20,
      { duration: 1, ease: "linear", autoplay: false },
      owner({ KeyframeResolver: R }),
    ),
  );
  const good = goodValue.animation;
  assert.throws(() => api.flushKeyframeResolvers(), /only this owner/);
  await rejected;
  good.time = 0.5;
  assert.equal(goodValue.get(), 10);
  assert.equal(badValue.isAnimating(), false);
  goodValue.stop();
});

test("constructor-time failures keep the original error before guard ownership attaches", () => {
  const failure = Error("construction phase");
  class R extends api.KeyframeResolver {
    constructor(...args) {
      super(...args);
      this.readKeyframes();
    }
    readKeyframes() {
      throw failure;
    }
  }
  assert.throws(
    () =>
      api.animateMotionValue(
        "x",
        api.motionValue(0),
        10,
        {},
        owner({ KeyframeResolver: R }),
      )(() => {}),
    (e) => e === failure,
  );
});
