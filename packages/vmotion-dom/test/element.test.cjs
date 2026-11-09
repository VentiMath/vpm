"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
function node(values = {}) {
  const style = {
    setProperty(k, v) {
      this[k] = String(v);
    },
    getPropertyValue(k) {
      return this[k] || "";
    },
    getPropertyPriority() {
      return "";
    },
    removeProperty(k) {
      delete this[k];
    },
  };
  return {
    nodeType: 1,
    style,
    namespaceURI: "http://www.w3.org/1999/xhtml",
    computed: { opacity: ".2", transform: "none", ...values },
    ownerDocument: {
      defaultView: {
        getComputedStyle: (e) => ({
          ...e.computed,
          getPropertyValue: (k) => e.computed[k] || "",
        }),
      },
    },
  };
}
function flush(e) {
  api.styleEffect.flush(e);
}
test("element fades share effect values and support seek, pause and completion", async () => {
  const e = node(),
    v = api.motionValue(0.2);
  api.styleEffect(e, { opacity: v });
  const [a] = api.animateElement(
    e,
    { opacity: 1 },
    { duration: 1, ease: "linear", autoplay: false },
  );
  a.time = 0.5;
  flush(e);
  assert.ok(Math.abs(Number(e.style.opacity) - 0.6) < 1e-12);
  assert.equal(api.styleEffect.get(e, "opacity"), v);
  a.complete();
  flush(e);
  await a.finished;
  assert.equal(Number(e.style.opacity), 1);
  api.releaseElement(e);
});
test("numeric CSS units and final variable endpoints paint correctly", async () => {
  const e = node({ width: "20px", "--size": "40px" });
  const [a] = api.animateElement(
    e,
    { width: "var(--size)" },
    { duration: 1, ease: "linear", autoplay: false },
  );
  a.time = 0.5;
  flush(e);
  assert.equal(e.style.width, "30px");
  a.complete();
  flush(e);
  await a.finished;
  assert.equal(e.style.width, "var(--size)");
  api.releaseElement(e);
  const p = node();
  const [b] = api.animateElement(
    p,
    { "--offset": ["10%", "30%"] },
    { duration: 1, ease: "linear", autoplay: false },
  );
  b.time = 0.5;
  flush(p);
  assert.equal(p.style["--offset"], "20%");
  b.cancel();
  flush(p);
  assert.equal(p.style["--offset"], "10%");
  b.stop();
  api.releaseElement(p);
});
test("scale keeps its spring default and multiple transforms compose", () => {
  const e = node();
  const [a, b] = api.animateElement(
    e,
    { scale: [0, 1], x: [0, 20] },
    { autoplay: false, x: { duration: 1, ease: "linear" } },
  );
  assert.ok(a.duration > 0);
  a.complete();
  b.time = 0.5;
  flush(e);
  assert.equal(e.style.transform, "translateX(10px)");
  api.releaseElement(e);
});
test("pending cancellation never paints and can resume; stop is terminal", async () => {
  const e = node();
  const [a] = api.animateElement(e, { opacity: 1 }, { autoplay: false });
  const cancelled = a.finished;
  a.cancel();
  api.flushKeyframeResolvers();
  await cancelled;
  assert.equal(api.styleEffect.get(e, "opacity"), undefined);
  a.play();
  a.complete();
  flush(e);
  await a.finished;
  assert.equal(Number(e.style.opacity), 1);
  api.releaseElement(e);
  const [b] = api.animateElement(e, { opacity: 0 });
  b.stop();
  b.play();
  api.flushKeyframeResolvers();
  await b.finished;
  assert.equal(api.styleEffect.get(e, "opacity"), undefined);
});
test("new pending requests supersede earlier unresolved work", async () => {
  const e = node();
  const [a] = api.animateElement(e, { opacity: 0.5 }, { autoplay: false });
  const [b] = api.animateElement(e, { opacity: 1 }, { autoplay: false });
  api.flushKeyframeResolvers();
  await a.finished;
  b.complete();
  flush(e);
  assert.equal(Number(e.style.opacity), 1);
  api.releaseElement(e);
});
test("release cancels unresolved and active element animations", async () => {
  const e = node();
  const [a] = api.animateElement(e, { opacity: 1 });
  api.releaseElement(e);
  api.flushKeyframeResolvers();
  await a.finished;
  assert.equal(api.styleEffect.get(e, "opacity"), undefined);
  const [b] = api.animateElement(e, { opacity: [0, 1] }, { autoplay: false });
  api.releaseElement(e);
  b.complete();
  flush(e);
  assert.equal(api.styleEffect.get(e, "opacity"), undefined);
});
test("invalid targets reject and missing variables reject finished without binding", async () => {
  const e = node();
  assert.throws(() => api.animateElement(e, { opacity: "red" }), /numeric/);
  assert.throws(() => api.animateElement(e, { opacity: Infinity }));
  const [a] = api.animateElement(
    e,
    { width: "var(--missing)" },
    { autoplay: false },
  );
  const failure = assert.rejects(a.finished, /unresolved CSS variable/);
  assert.throws(() => api.flushKeyframeResolvers(), /unresolved CSS variable/);
  await failure;
  assert.equal(api.styleEffect.get(e, "width"), undefined);
  api.releaseElement(e);
});
test("options and keyframe arrays are snapshots before deferred reads", () => {
  const e = node(),
    frames = [null, 0.5, 1],
    times = [0, 0.5, 1],
    ease = ["linear", "linear"];
  const [a] = api.animateElement(
    e,
    { opacity: frames },
    { duration: 1, ease, times, autoplay: false },
  );
  frames[1] = 99;
  times[1] = 0.99;
  ease[0] = "easeIn";
  a.time = 0.25;
  flush(e);
  assert.equal(Number(e.style.opacity), 0.35);
  api.releaseElement(e);
});
test("per-property transition selection and elapsed time use seconds", () => {
  const e = node();
  const [a, b] = api.animateElement(
    e,
    { opacity: [0, 1], x: [0, 100] },
    {
      duration: 2,
      opacity: { duration: 1, ease: "linear" },
      x: { duration: 1, ease: "linear" },
      autoplay: false,
    },
  );
  a.time = 0.5;
  b.time = 0.5;
  flush(e);
  assert.equal(Number(e.style.opacity), 0.5);
  assert.equal(e.style.transform, "translateX(50px)");
  api.releaseElement(e);
});
test("animateValues resolves current values and updates them", async () => {
  const values = { x: api.motionValue(10), opacity: api.motionValue(0) };
  const controls = api.animateValues(
    (k) => values[k],
    { x: 20, opacity: 1 },
    { duration: 1, ease: "linear", autoplay: false },
  );
  controls.forEach((a) => (a.time = 0.5));
  assert.equal(values.x.get(), 15);
  assert.equal(values.opacity.get(), 0.5);
  controls.forEach((a) => a.complete());
  await Promise.all(controls.map((a) => a.finished));
});

test("a cancelled pending promise stays settled after immediate replay", async () => {
  const e = node();
  const [a] = api.animateElement(e, { opacity: 1 }, { autoplay: false });
  const old = a.finished;
  a.cancel();
  a.play();
  a.pause();
  await old;
  let resolved = false;
  a.finished.then(() => (resolved = true));
  await Promise.resolve();
  assert.equal(resolved, false);
  a.complete();
  await a.finished;
  api.releaseElement(e);
});
test("invalid deferred replacement preserves live playback", async () => {
  const e = node(),
    [a] = api.animateElement(
      e,
      { width: [10, 20] },
      { duration: 1, ease: "linear", autoplay: false },
    );
  const [b] = api.animateElement(
    e,
    { width: "var(--missing)" },
    { autoplay: false },
  );
  const rejected = assert.rejects(b.finished, /unresolved/);
  assert.throws(() => api.flushKeyframeResolvers(), /unresolved/);
  await rejected;
  a.time = 0.5;
  flush(e);
  assert.equal(e.style.width, "15px");
  api.releaseElement(e);
});
test("SVG animations target attributes and path drawing through the SVG effect", () => {
  const e = node();
  e.namespaceURI = "http://www.w3.org/2000/svg";
  const attrs = new Map();
  e.getAttribute = (k) => attrs.get(k) ?? null;
  e.setAttribute = (k, v) => attrs.set(k, String(v));
  e.removeAttribute = (k) => attrs.delete(k);
  const controls = api.animateElement(
    e,
    { attrX: [0, 10], pathLength: [0, 1] },
    { duration: 1, ease: "linear", autoplay: false },
  );
  controls.forEach((a) => (a.time = 0.5));
  api.svgEffect.flush(e);
  assert.equal(attrs.get("x"), "5px");
  assert.equal(attrs.get("stroke-dasharray"), "0.5 0.5");
  api.releaseElement(e);
});

test("delayed element seeking uses total elapsed time including delay", () => {
  const e = node(),
    [a] = api.animateElement(
      e,
      { opacity: [0, 1] },
      { duration: 1, delay: 0.2, ease: "linear", autoplay: false },
    );
  a.time = 0.1;
  flush(e);
  assert.equal(Number(e.style.opacity), 0);
  assert.equal(a.time, 0.1);
  a.time = 0.7;
  flush(e);
  assert.ok(Math.abs(Number(e.style.opacity) - 0.5) < 1e-12);
  assert.equal(a.time, 0.7);
  api.releaseElement(e);
});
test("failed start listeners remain observable from a pending finished promise", async () => {
  const e = node(),
    value = api.motionValue(0.2);
  api.styleEffect(e, { opacity: value });
  value.on("animationStart", () => {
    throw Error("start failed");
  });
  const [a] = api.animateElement(e, { opacity: 1 }, { autoplay: false });
  const rejected = assert.rejects(a.finished, /start failed/);
  api.flushKeyframeResolvers();
  a.stop();
  await rejected;
  api.releaseElement(e);
});
test("reentrant starts cannot attach a superseded controller", async () => {
  const e = node(),
    value = api.motionValue(0.2);
  api.styleEffect(e, { opacity: value });
  let second;
  const off = value.on("animationStart", () => {
    off();
    [second] = api.animateElement(
      e,
      { opacity: [0.2, 0.8] },
      { autoplay: false },
    );
  });
  const [first] = api.animateElement(e, { opacity: 1 }, { autoplay: false });
  api.flushKeyframeResolvers();
  second.complete();
  flush(e);
  await first.finished;
  assert.equal(Number(e.style.opacity), 0.8);
  api.releaseElement(e);
});
test("one missing variable does not strand other pending animations", async () => {
  const e = node();
  const [bad, good] = api.animateElement(
    e,
    { width: "var(--missing)", opacity: 1 },
    { autoplay: false },
  );
  const rejected = assert.rejects(bad.finished, /unresolved/);
  assert.throws(() => api.flushKeyframeResolvers(), /unresolved/);
  await rejected;
  good.complete();
  await good.finished;
  flush(e);
  assert.equal(Number(e.style.opacity), 1);
  api.releaseElement(e);
});

test("backwards completion keeps the origin instead of the forward CSS variable", async () => {
  const e = node({ width: "20px", "--size": "40px" });
  let tick,
    now = 1000;
  const [a] = api.animateElement(
    e,
    { width: "var(--size)" },
    {
      duration: 1,
      ease: "linear",
      autoplay: false,
      driver: (fn) => ((tick = fn), { now: () => now, start() {}, stop() {} }),
    },
  );
  a.time = 1;
  a.speed = -1;
  a.play();
  now = 2000;
  tick(now);
  await a.finished;
  flush(e);
  assert.equal(e.style.width, "20px");
  api.releaseElement(e);
});
test("skip and reduced-motion settings make transform playback instantaneous", () => {
  for (const options of [{ skipAnimations: true }, { reduceMotion: true }]) {
    const e = node(),
      [a] = api.animateElement(e, { scale: [0.2, 1] }, options);
    assert.equal(a.duration, 0);
    a.complete();
    flush(e);
    assert.equal(e.style.transform, "none");
    api.releaseElement(e);
  }
});

test("synchronous start-hook completion preserves responsive endpoints and lifecycle order", async () => {
  const e = node({ width: "20px", "--size": "40px" }),
    value = api.motionValue("20px"),
    events = [];
  api.styleEffect(e, { width: value });
  value.on("animationStart", () => {
    events.push("start");
    value.animation.complete();
  });
  value.on("animationComplete", () => events.push("complete"));
  const [a] = api.animateElement(
    e,
    { width: "var(--size)" },
    { duration: 1, onComplete: () => events.push("callback") },
  );
  const finished = a.finished;
  api.flushKeyframeResolvers();
  await finished;
  flush(e);
  assert.equal(e.style.width, "var(--size)");
  assert.deepEqual(events, ["start", "callback", "complete"]);
  api.releaseElement(e);
});
