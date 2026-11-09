"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
const flush = () =>
  api.frameSteps.render.process({
    timestamp: 100,
    delta: 16,
    isProcessing: true,
  });
function element() {
  const writes = [],
    attributes = {};
  const style = new Proxy(
    {
      opacity: "",
      fill: "",
      width: "",
      strokeWidth: "",
      setProperty(k, v) {
        this[k] = String(v);
      },
    },
    {
      set(o, k, v) {
        writes.push([k, v]);
        o[k] = v;
        return true;
      },
    },
  );
  return {
    nodeType: 1,
    style,
    writes,
    attributes,
    setAttribute(k, v) {
      writes.push([k, String(v)]);
      attributes[k] = String(v);
    },
  };
}
test("styles paint initially on render and coalesce repeated changes", () => {
  const e = element(),
    v = api.motionValue(0.2),
    off = api.styleEffect(e, { opacity: v });
  assert.equal(e.writes.length, 0);
  v.set(0.3);
  v.set(0.4);
  flush();
  assert.deepEqual(e.writes, [["opacity", 0.4]]);
  flush();
  assert.equal(e.writes.length, 1);
  off();
  v.set(0.8);
  flush();
  assert.equal(e.style.opacity, 0.4);
});
test("numeric CSS units, strings, variables and alpha values", () => {
  const e = element(),
    values = {
      width: 12,
      rotate: 45,
      originX: 0.3,
      originZ: 5,
      zIndex: 2.6,
      opacity: 2,
      "--count": 4,
      "background-color": "red",
      marginInline: 3,
    };
  const off = api.styleEffect(
    e,
    Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, api.motionValue(v)]),
    ),
  );
  flush();
  assert.equal(e.style.width, "12px");
  assert.equal(e.style.marginInline, "3px");
  assert.equal(e.style.transform, "rotate(45deg)");
  assert.equal(e.style.transformOrigin, "30% 50% 5px");
  assert.equal(e.style.zIndex, 3);
  assert.equal(e.style.opacity, 1);
  assert.equal(e.style["--count"], "4");
  assert.equal(e.style["background-color"], "red");
  off();
});
test("transform order, aliases, defaults and explicit transform precedence", () => {
  const e = element(),
    x = api.motionValue(10),
    r = api.motionValue(20),
    s = api.motionValue(2);
  const off = api.styleEffect(e, { rotate: r, scale: s, x });
  flush();
  assert.equal(e.style.transform, "translateX(10px) scale(2) rotate(20deg)");
  x.set(0);
  r.set(0);
  s.set(1);
  flush();
  assert.equal(e.style.transform, "none");
  const direct = api.styleEffect(e, {
    transform: api.motionValue("translateX(50%)"),
  });
  flush();
  assert.equal(e.style.transform, "translateX(50%)");
  direct();
  off();
});
test("separate bindings share transforms and cleanup freezes only the removed component", () => {
  const e = element(),
    x = api.motionValue(5),
    y = api.motionValue(6),
    a = api.styleEffect(e, { x }),
    b = api.styleEffect(e, { y });
  flush();
  a();
  x.set(20);
  y.set(8);
  flush();
  assert.equal(e.style.transform, "translateX(5px) translateY(8px)");
  b();
});
test("cancelling before first paint prevents queued writes", () => {
  const e = element(),
    off = api.styleEffect(e, {
      x: api.motionValue(10),
      opacity: api.motionValue(0.5),
    });
  off();
  off();
  flush();
  assert.deepEqual(e.writes, []);
});
test("stale cleanup cannot remove a replacement even when the value is reused", () => {
  for (const same of [false, true]) {
    const e = element(),
      a = api.motionValue(0.2),
      b = same ? a : api.motionValue(0.3),
      offA = api.styleEffect(e, { opacity: a }),
      offB = api.styleEffect(e, { opacity: b });
    offA();
    b.set(0.7);
    flush();
    assert.equal(e.style.opacity, 0.7);
    assert.equal(api.styleEffect.get(e, "opacity"), b);
    offB();
  }
});
test("manual flush consumes pending work exactly once", () => {
  const e = element(),
    off = api.styleEffect(e, { opacity: api.motionValue(0.5) });
  api.styleEffect.flush(e);
  assert.equal(e.writes.length, 1);
  flush();
  assert.equal(e.writes.length, 1);
  off();
});
test("release returns bound values and clears retained transforms", () => {
  const e = element(),
    x = api.motionValue(2),
    off = api.styleEffect(e, { x });
  flush();
  const values = api.releaseElement(e);
  assert.equal(values.get("x"), x);
  assert.equal(api.styleEffect.get(e, "x"), undefined);
  const newer = api.styleEffect(e, { rotate: api.motionValue(10) });
  off();
  flush();
  assert.equal(e.style.transform, "rotate(10deg)");
  newer();
});
test("attribute setters preserve types and aria/data names normalize", () => {
  const e = element();
  let checked;
  Object.defineProperty(e, "checked", { set: (v) => (checked = v) });
  const off = api.attrEffect(e, {
    checked: api.motionValue(false),
    ariaValuenow: api.motionValue(3),
    dataState: api.motionValue("open"),
    x: api.motionValue(5),
    viewBox: api.motionValue("0 0 10 10"),
  });
  flush();
  assert.equal(checked, false);
  assert.deepEqual(e.attributes, {
    "aria-valuenow": "3",
    "data-state": "open",
    x: "5px",
    viewBox: "0 0 10 10",
  });
  off();
});
test("propEffect assigns exact values and leaves unrelated properties", () => {
  const target = { untouched: 1 },
    object = { color: "red" },
    v = api.motionValue(object),
    off = api.propEffect(target, { material: v });
  flush();
  assert.equal(target.material, object);
  assert.equal(target.untouched, 1);
  off();
});
test("SVG style routing, forced attributes, path drawing and transforms", () => {
  const e = element(),
    length = api.motionValue(0.4),
    offset = api.motionValue(0.2),
    off = api.svgEffect(e, {
      fill: api.motionValue("red"),
      attrWidth: api.motionValue(10),
      viewBox: api.motionValue("0 0 20 20"),
      pathLength: length,
      pathOffset: offset,
      scale: api.motionValue(2),
    });
  flush();
  assert.equal(e.style.fill, "red");
  assert.equal(e.style.transform, "scale(2)");
  assert.equal(e.attributes.width, "10px");
  assert.equal(e.attributes.viewBox, "0 0 20 20");
  assert.equal(e.attributes.pathLength, "1");
  assert.equal(e.attributes["stroke-dasharray"], "0.4 0.6");
  assert.equal(e.attributes["stroke-dashoffset"], "-0.2");
  length.set(0.7);
  offset.set(0.3);
  flush();
  assert.equal(e.attributes["stroke-dasharray"], "0.7 0.30000000000000004");
  off();
});
test("SVG explicit spacing and transformBox are respected", () => {
  const e = element();
  e.style.transformBox = "view-box";
  const off = api.svgEffect(e, {
    x: api.motionValue(3),
    pathSpacing: api.motionValue(0.2),
  });
  flush();
  assert.equal(e.style.transformBox, "view-box");
  assert.equal(e.attributes["stroke-dasharray"], "1 0.2");
  off();
});
test("selector resolution accepts scoped collections and caches without inherited keys", () => {
  const a = element(),
    b = element();
  let calls = 0;
  const scope = {
      current: {
        querySelectorAll(q) {
          calls++;
          assert.equal(q, "toString");
          return [a, b];
        },
      },
    },
    cache = {};
  assert.deepEqual(api.resolveElements("toString", scope, cache), [a, b]);
  assert.deepEqual(api.resolveElements("toString", scope, cache), [a, b]);
  assert.equal(calls, 1);
  assert.deepEqual(api.resolveElements(null), []);
  assert.deepEqual(api.resolveElements(new Set([a, b])), [a, b]);
  const off = api.styleEffect([a, a, b], { opacity: api.motionValue(0.4) });
  flush();
  assert.equal(a.writes.length, 1);
  assert.equal(b.writes.length, 1);
  off();
});
test("invalid maps and subjects fail before attaching any binding", () => {
  const e = element(),
    v = api.motionValue(1);
  assert.throws(() => api.styleEffect(e, { width: v, opacity: 3 }), TypeError);
  assert.equal(api.styleEffect.get(e, "width"), undefined);
  assert.throws(() => api.styleEffect([e, {}], { width: v }), TypeError);
  flush();
  assert.equal(e.writes.length, 0);
  assert.throws(
    () => api.propEffect({}, JSON.parse('{"__proto__": {}}')),
    TypeError,
  );
});
test("nonfinite values fail without blocking other subjects or future frames", () => {
  const a = element(),
    b = element(),
    v = api.motionValue(NaN),
    offA = api.styleEffect(a, { width: v }),
    offB = api.styleEffect(b, { opacity: api.motionValue(0.5) });
  assert.throws(flush, RangeError);
  assert.equal(b.style.opacity, 0.5);
  v.set(5);
  flush();
  assert.equal(a.style.width, "5px");
  offA();
  offB();
});
test("throwing property setter does not lose another pending write", () => {
  const target = {};
  Object.defineProperty(target, "bad", {
    set() {
      throw Error("setter");
    },
  });
  const off = api.propEffect(target, {
    bad: api.motionValue(1),
    good: api.motionValue(2),
  });
  assert.throws(flush, /setter/);
  assert.equal(target.good, 2);
  off();
});
test("reentrant changes render next frame and cancellation suppresses another queued write", () => {
  const target = {},
    later = api.motionValue(1);
  let stop,
    seen = [];
  Object.defineProperty(target, "first", {
    set(v) {
      seen.push(v);
      later.set(3);
      stop();
    },
  });
  stop = api.propEffect(target, { later });
  const off = api.propEffect(target, { first: api.motionValue(2) });
  flush();
  assert.equal(target.later, 1);
  flush();
  assert.equal(target.later, 1);
  assert.deepEqual(seen, [2]);
  off();
});
test("upstream-compatible MotionValue duck typing supports independent producers", () => {
  let n = 0.2,
    callback,
    unsubscribed = 0;
  const value = {
    get: () => n,
    on(name, fn) {
      assert.equal(name, "change");
      callback = fn;
      return () => unsubscribed++;
    },
  };
  const e = element(),
    off = api.styleEffect(e, { opacity: value });
  n = 0.8;
  callback();
  flush();
  assert.equal(e.style.opacity, 0.8);
  off();
  assert.equal(unsubscribed, 1);
});

test("cleanup in an earlier write suppresses a later queued property", () => {
  const target = {};
  let stopLater;
  Object.defineProperty(target, "first", {
    set() {
      stopLater();
    },
  });
  const stopFirst = api.propEffect(target, { first: api.motionValue(1) });
  stopLater = api.propEffect(target, { later: api.motionValue(2) });
  flush();
  assert.equal(target.later, undefined);
  stopFirst();
});
test("removing one component before initial paint does not leak it into its sibling", () => {
  const e = element(),
    a = api.styleEffect(e, { x: api.motionValue(10) }),
    b = api.styleEffect(e, { y: api.motionValue(20) });
  a();
  flush();
  assert.equal(e.style.transform, "translateY(20px)");
  b();
});
test("unit-string identity transforms collapse to none", () => {
  const e = element(),
    off = api.styleEffect(e, {
      x: api.motionValue("0px"),
      rotate: api.motionValue("0deg"),
      scale: api.motionValue("1"),
    });
  flush();
  assert.equal(e.style.transform, "none");
  off();
});

test("optimized transforms retain finite validation and replacement ownership", () => {
  const e = element(),
    x = api.motionValue(2),
    old = api.styleEffect(e, { x });
  flush();
  const next = api.motionValue(4),
    off = api.styleEffect(e, { x: next });
  old();
  next.set(Infinity);
  assert.throws(flush, RangeError);
  assert.equal(e.style.transform, "translateX(2px)");
  next.set(6);
  flush();
  assert.equal(e.style.transform, "translateX(6px)");
  off();
});
