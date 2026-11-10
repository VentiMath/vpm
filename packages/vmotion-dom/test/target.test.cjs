"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
function owner() {
  const values = new Map();
  return {
    current: {},
    latestValues: { opacity: 1, x: 0, display: "block" },
    getValue: (k) => values.get(k),
    addValue: (k, v) => values.set(k, v),
    getProps: () => ({}),
    getDefaultTransition: () => ({
      duration: 1,
      ease: "linear",
      autoplay: false,
    }),
  };
}
async function settle() {
  for (let i = 0; i < 6; i++) await Promise.resolve();
  api.frameSteps.update.process({
    timestamp: 1000,
    delta: 16,
    isProcessing: true,
  });
}
test("target applies snapshotted end values only after every member completes", async () => {
  const o = owner(),
    end = { display: "none", opacity: 0.2 },
    a = api.animateTarget(o, { opacity: 0, x: 20, transitionEnd: end });
  end.display = "bad";
  a[0].complete();
  await settle();
  assert.equal(o.getValue("display").get(), "block");
  a[1].complete();
  await settle();
  assert.equal(o.getValue("display").get(), "none");
  assert.equal(o.getValue("opacity").get(), 0.2);
});
test("stopped, cancelled, failed and replaced targets cannot apply old ends", async () => {
  for (const action of ["stop", "cancel", "replace", "direct"]) {
    const o = owner(),
      a = api.animateTarget(o, {
        opacity: 0,
        transitionEnd: { display: "none" },
      });
    if (action === "replace") {
      a[0].complete();
      api.animateTarget(o, { opacity: 1 });
    } else if (action === "direct") {
      a[0].complete();
      api.animateValues(
        (k) => o.getValue(k),
        { opacity: [0, 1] },
        { autoplay: false },
      );
    } else a[0][action]();
    await settle();
    assert.equal(o.getValue("display").get(), "block", action);
    for (const key of ["opacity", "display"]) o.getValue(key)?.stop();
  }
  const o = owner();
  class Broken extends api.KeyframeResolver {
    constructor(...args) {
      super(...args);
      this.isAsync = true;
    }
    readKeyframes() {
      throw Error("read");
    }
  }
  o.KeyframeResolver = Broken;
  const a = api.animateTarget(o, {
    opacity: 0,
    transitionEnd: { display: "none" },
  });
  const rejected = assert.rejects(a[0].finished, /read/);
  assert.throws(() => api.flushKeyframeResolvers(), /read/);
  await rejected;
  await settle();
  assert.equal(o.getValue("display").get(), "block");
});
test("a replacement after completion queues but before the end frame invalidates old writes", async () => {
  const o = owner(),
    a = api.animateTarget(o, {
      opacity: 0,
      transitionEnd: { display: "none" },
    });
  a[0].complete();
  for (let i = 0; i < 6; i++) await Promise.resolve();
  const b = api.animateTarget(o, {
    display: undefined,
    transitionEnd: { display: "grid" },
  });
  await settle();
  assert.equal(o.getValue("display").get(), "grid");
  assert.equal(b.length, 0);
});
test("invalid end values reject before stopping existing playback", () => {
  const o = owner(),
    a = api.animateTarget(o, { opacity: 0 });
  assert.throws(
    () => api.animateTarget(o, { opacity: 1, transitionEnd: { display: {} } }),
    /transitionEnd/,
  );
  assert.equal(a[0].stopped, false);
  assert.throws(
    () =>
      api.animateTarget(
        o,
        JSON.parse('{"transitionEnd":{"__proto__":"none"}}'),
      ),
    /unsafe/,
  );
  a[0].stop();
});
test("target defaults and overrides preserve per-property transitions and end-only targets", async () => {
  const o = owner(),
    a = api.animateTarget(
      o,
      { opacity: 0, transition: { duration: 2, autoplay: false } },
      { transitionOverride: { duration: 0.4, autoplay: false }, delay: 0.1 },
    );
  assert.equal(a[0].duration, 0.4);
  assert.equal(a[0].iterationDuration, 0.5);
  a[0].stop();
  api.animateTarget(o, { transitionEnd: { display: "none" } });
  await settle();
  assert.equal(o.getValue("display").get(), "none");
});

test("synchronous playback callbacks cannot overwrite a newer target's completion token", async () => {
  const o = owner();
  const handles = api.animateTarget(o, {
    opacity: 0,
    transition: {
      type: false,
      onPlay() {
        api.animateTarget(o, { transitionEnd: { display: "grid" } });
      },
    },
    transitionEnd: { display: "none" },
  });
  handles[0].complete();
  await settle();
  assert.equal(o.getValue("display").get(), "grid");
});
test("a throwing end-property accessor does not start replacement animations", () => {
  const o = owner(),
    a = api.animateTarget(o, { opacity: 0 }),
    get = o.getValue;
  o.getValue = (k) => {
    if (k === "display") throw Error("access");
    return get(k);
  };
  assert.throws(
    () =>
      api.animateTarget(o, { opacity: 1, transitionEnd: { display: "none" } }),
    /access/,
  );
  assert.equal(a[0].stopped, false);
  a[0].stop();
});

test("throwing completion callbacks do not apply transitionEnd", async () => {
  const o = owner(),
    a = api.animateTarget(o, {
      opacity: 0,
      transition: {
        duration: 1,
        autoplay: false,
        onComplete() {
          throw Error("callback");
        },
      },
      transitionEnd: { display: "none" },
    });
  assert.throws(() => a[0].complete(), /callback/);
  await settle();
  assert.equal(o.getValue("display").get(), "block");
});

test("end-only properties retain their existing renderer value during playback", async () => {
  const o = owner();
  delete o.latestValues.display;
  o.readValue = (key) => (key === "display" ? "flex" : undefined);
  const handles = api.animateTarget(o, {
    opacity: 0,
    transitionEnd: { display: "none" },
  });
  assert.equal(o.getValue("display").get(), "flex");
  handles[0].complete();
  await settle();
  assert.equal(o.getValue("display").get(), "none");
});

test("completion barriers preserve MotionValue lifecycle listener failures", async () => {
  const o = owner(),
    value = api.motionValue(1);
  o.addValue("opacity", value);
  value.on("animationComplete", () => {
    throw Error("listener");
  });
  const [a] = api.animateTarget(o, {
    opacity: 0,
    transitionEnd: { display: "none" },
  });
  const rejected = assert.rejects(a.finished, /listener/);
  a.complete();
  await rejected;
  await settle();
  assert.equal(o.getValue("display").get(), "block");
});

test("end writes remain deferred when completion happens in the same call stack", async () => {
  const o = owner(),
    [a] = api.animateTarget(o, {
      opacity: 0,
      transitionEnd: { display: "none" },
    });
  a.complete();
  api.frameSteps.update.process({
    timestamp: 1000,
    delta: 16,
    isProcessing: true,
  });
  assert.equal(o.getValue("display").get(), "block");
  await settle();
  assert.equal(o.getValue("display").get(), "none");
});
