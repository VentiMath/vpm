"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
function node(svg = false) {
  const style = {
    setProperty(k, v) {
      this[k] = String(v);
    },
  };
  return {
    nodeType: 1,
    style,
    namespaceURI: svg
      ? "http://www.w3.org/2000/svg"
      : "http://www.w3.org/1999/xhtml",
    setAttribute(k, v) {
      this[k] = v;
    },
    computed: {
      width: "20px",
      "--end": "40px",
      opacity: ".2",
      transform: "none",
    },
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
function renderer(e) {
  const values = new Map(),
    offs = new Map(),
    updates = [];
  const owner = {
    current: e,
    values,
    updates,
    getProps: () => ({}),
    getValue: (k) => values.get(k),
    addValue(k, v) {
      offs.get(k)?.();
      values.set(k, v);
      offs.set(
        k,
        v.on("change", (x) => updates.push([k, x])),
      );
    },
    removeValue(k) {
      offs.get(k)?.();
      offs.delete(k);
      values.delete(k);
    },
    readValue: (k) => api.readStyleValue(e, k),
    render() {
      for (const [k, v] of values) e.style[k] = String(v.get());
    },
    destroy() {
      for (const k of values.keys()) this.removeValue(k);
    },
  };
  return owner;
}
test("handoff retains identities, velocity and the active controller; removes queued source writes", async () => {
  const e = node(),
    owner = renderer(e),
    v = api.motionValue(0);
  api.time.set(1000);
  v.setWithVelocity(0, 0.2, 10);
  const velocity = v.getVelocity();
  api.styleEffect(e, { opacity: v });
  const [a] = api.animateElement(
    e,
    { opacity: [0.2, 1] },
    { duration: 1, ease: "linear", autoplay: false },
  );
  a.time = 0.5;
  const control = v.animation,
    latest = v.get(),
    before = v.getVelocity();
  api.handOffElementState(e, owner);
  assert.equal(owner.getValue("opacity"), v);
  assert.equal(v.owner, owner);
  assert.equal(v.animation, control);
  assert.equal(v.getVelocity(), before);
  assert.ok(velocity > 0);
  assert.equal(api.styleEffect.get(e, "opacity"), undefined);
  api.styleEffect.flush(e);
  assert.equal(e.style.opacity, undefined);
  api.releaseElement(e);
  a.time = 0.75;
  owner.render();
  assert.ok(Math.abs(Number(e.style.opacity) - 0.8) < 1e-12);
  assert.notEqual(v.get(), latest);
  a.complete();
  await a.finished;
  assert.equal(v.get(), 1);
  owner.destroy();
});
test("pending element work transfers before resolution and never reattaches source effects", async () => {
  const e = node(),
    owner = renderer(e),
    [a] = api.animateElement(
      e,
      { width: "var(--end)" },
      { duration: 1, ease: "linear", autoplay: false },
    );
  api.handOffElementState(e, owner);
  api.releaseElement(e);
  a.time = 0.5;
  owner.render();
  assert.equal(e.style.width, "30");
  assert.equal(api.styleEffect.get(e, "width"), undefined);
  a.complete();
  await a.finished;
  owner.render();
  assert.equal(e.style.width, "var(--end)");
  owner.destroy();
});
test("source release after handoff cannot stop a transferred direct value", () => {
  const e = node(),
    owner = renderer(e),
    v = api.motionValue(0);
  api.styleEffect(e, { x: v });
  const a = api.animateSingleValue(v, 10, {
    duration: 1,
    ease: "linear",
    autoplay: false,
  });
  api.handOffElementState(e, owner);
  api.releaseElement(e);
  a.time = 0.5;
  assert.equal(v.get(), 5);
  assert.equal(v.isAnimating(), true);
  a.stop();
  owner.destroy();
});
test("handoff replaces destination values and stale source disposers cannot detach subsequent bindings", () => {
  const e = node(),
    owner = renderer(e),
    v = api.motionValue(0.4),
    old = api.motionValue(0.8),
    next = api.motionValue(0.6);
  owner.addValue("opacity", old);
  const off = api.styleEffect(e, { opacity: v });
  api.handOffElementState(e, owner);
  assert.equal(owner.getValue("opacity"), v);
  api.styleEffect(e, { opacity: next });
  off();
  api.styleEffect.flush(e);
  assert.equal(Number(e.style.opacity), 0.6);
  api.releaseElement(e);
  owner.destroy();
});
test("destination failure restores ownership and entries without detaching source bindings", () => {
  const e = node(),
    owner = renderer(e),
    x = api.motionValue(1),
    y = api.motionValue(2),
    old = api.motionValue(3),
    previousOwner = { current: e, getProps: () => ({}) };
  x.owner = previousOwner;
  owner.addValue("x", old);
  api.styleEffect(e, { x, y });
  const add = owner.addValue;
  owner.addValue = (k, v) => {
    add(k, v);
    if (k === "y" && v === y) throw Error("destination failed");
  };
  assert.throws(() => api.handOffElementState(e, owner), /destination failed/);
  assert.equal(owner.getValue("x"), old);
  assert.equal(owner.getValue("y"), undefined);
  assert.equal(x.owner, previousOwner);
  assert.equal(y.owner, undefined);
  assert.equal(api.styleEffect.get(e, "x"), x);
  assert.equal(api.styleEffect.get(e, "y"), y);
  api.styleEffect.flush(e);
  assert.equal(e.style.transform, "translateX(1px) translateY(2px)");
  api.releaseElement(e);
  owner.destroy();
});
test("reentrant source replacement survives transfer cleanup", () => {
  const e = node(),
    owner = renderer(e),
    v = api.motionValue(0.2),
    next = api.motionValue(0.8);
  api.styleEffect(e, { opacity: v });
  const add = owner.addValue;
  owner.addValue = (k, value) => {
    add(k, value);
    api.styleEffect(e, { opacity: next });
  };
  api.handOffElementState(e, owner);
  assert.equal(owner.getValue("opacity"), v);
  assert.equal(api.styleEffect.get(e, "opacity"), next);
  api.styleEffect.flush(e);
  assert.equal(Number(e.style.opacity), 0.8);
  api.releaseElement(e);
  owner.destroy();
});
test("SVG state and empty transfers use the same ownership contract", () => {
  const e = node(true),
    owner = renderer(e),
    v = api.motionValue(0.5);
  api.svgEffect(e, { pathLength: v });
  api.handOffElementState(e, owner);
  assert.equal(owner.getValue("pathLength"), v);
  assert.equal(api.svgEffect.get(e, "pathLength"), undefined);
  api.svgEffect.flush(e);
  assert.equal(e.pathLength, undefined);
  api.handOffElementState(e, owner);
  owner.destroy();
});
test("invalid destinations leave source state intact", () => {
  const e = node(),
    v = api.motionValue(1);
  api.styleEffect(e, { x: v });
  assert.throws(() => api.handOffElementState(e, renderer(node())), /own/);
  assert.throws(() => api.handOffElementState(e, { current: e }), /getValue/);
  assert.equal(api.styleEffect.get(e, "x"), v);
  api.releaseElement(e);
});
test("renderer-owned animation shares values, supports retargeting, and avoids source bindings", async () => {
  const e = node(),
    owner = renderer(e),
    v = api.motionValue(0.2);
  owner.addValue("opacity", v);
  const [a] = api.animateElement(
    e,
    { opacity: 1 },
    { duration: 1, ease: "linear", autoplay: false },
    owner,
  );
  a.time = 0.5;
  assert.ok(Math.abs(v.get() - 0.6) < 1e-12);
  assert.equal(api.styleEffect.get(e, "opacity"), undefined);
  const [b] = api.animateElement(
    e,
    { opacity: 0 },
    { duration: 1, ease: "linear", autoplay: false },
    owner,
  );
  b.time = 0.5;
  assert.ok(Math.abs(v.get() - 0.3) < 1e-12);
  assert.equal(a.state, "idle");
  api.releaseElement(e);
  b.complete();
  await b.finished;
  assert.equal(v.get(), 0);
  owner.destroy();
});
test("new renderer values read the DOM and preserve default spring and reduced-motion behavior", () => {
  const e = node(),
    owner = renderer(e),
    [fade, scale] = api.animateElement(
      e,
      { opacity: 1, scale: [0, 1] },
      {},
      owner,
    );
  assert.ok(scale.duration > 0);
  assert.equal(owner.getValue("opacity").owner, owner);
  fade.complete();
  scale.stop();
  owner.shouldReduceMotion = true;
  const [x, opacity] = api.animateElement(
    e,
    { x: 20, opacity: [0, 1] },
    { duration: 1, autoplay: false },
    owner,
  );
  assert.equal(x.duration, 0);
  assert.equal(opacity.duration, 1);
  x.stop();
  opacity.stop();
  owner.shouldSkipAnimations = true;
  const [all] = api.animateElement(
    e,
    { opacity: 1 },
    { duration: 1, autoplay: false },
    owner,
  );
  assert.equal(all.duration, 0);
  all.stop();
  owner.destroy();
});
test("invalid renderer target validates before new values are installed", () => {
  const e = node(),
    owner = renderer(e);
  assert.throws(() =>
    api.animateElement(e, { x: 1, opacity: Infinity }, {}, owner),
  );
  assert.throws(() => api.animateElement(e, {x: 1}, null, owner), /transition/);
  assert.equal(owner.values.size, 0);
  owner.destroy();
});
