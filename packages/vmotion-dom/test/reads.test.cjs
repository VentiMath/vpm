"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  api = require("..");
function fixture(values = {}) {
  const style = new Map(),
    priorities = new Map(),
    events = [];
  const node = {
    ownerDocument: {
      defaultView: {
        getComputedStyle(element) {
          assert.equal(this, node.ownerDocument.defaultView);
          assert.equal(element, node);
          return { getPropertyValue: (key) => values[key] ?? "", ...values };
        },
      },
    },
    style: {
      getPropertyValue: (k) => style.get(k) ?? "",
      getPropertyPriority: (k) => priorities.get(k) ?? "",
      setProperty(k, v, p = "") {
        style.set(k, v);
        priorities.set(k, p);
        events.push(["set", k, v]);
      },
      removeProperty(k) {
        style.delete(k);
        priorities.delete(k);
        events.push(["remove", k]);
      },
    },
    getAttribute: (k) =>
      ({ "stroke-width": "2", viewBox: "0 0 10 10", x: "4" })[k] ?? null,
  };
  return { node, values, style, events };
}
test("reads use the element's own document and preserve CSS units", () => {
  const { node } = fixture({
    width: " 20px ",
    opacity: ".4",
    "--gap": "  12px ",
  });
  assert.equal(api.readStyleValue(node, "width"), "20px");
  assert.equal(api.readStyleValue(node, "--gap"), "12px");
  assert.equal(api.readStyleValue(node, "missing"), 0);
  assert.equal(api.readStyleValue(node, "opacity"), ".4");
});
test("SVG attribute names, CSS fallback and transform defaults", () => {
  const { node } = fixture({
    opacity: ".5",
    transform: "matrix(2,0,0,2,10,20)",
  });
  assert.equal(api.readSVGValue(node, "opacity"), ".5");
  assert.equal(api.readSVGValue(node, "strokeWidth"), "2");
  assert.equal(api.readSVGValue(node, "viewBox"), "0 0 10 10");
  assert.equal(api.readSVGValue(node, "attrX"), "4");
  assert.equal(api.readSVGValue(node, "scale"), 1);
  assert.equal(api.readSVGValue(node, "x"), 0);
  assert.equal(api.readSVGValue(node, "missing"), undefined);
});
test("matrix extraction handles rotation, scale, reflection and absent axes", () => {
  const p = api.parseValueFromTransform;
  assert.equal(p("matrix(0,2,-2,0,10,20)", "scale"), 2);
  assert.equal(p("matrix(0,2,-2,0,10,20)", "rotate"), 90);
  assert.equal(p("matrix(1,0,0,1,10,20)", "z"), 0);
  assert.equal(p("matrix(1,0,0,-1,0,0)", "scaleY"), -1);
  assert.equal(p("matrix(1,0,1,1,0,0)", "skewX"), 45);
  assert.equal(
    p(
      "matrix3d(2,0,0,0,0,3,0,0,0,0,4,-0.002,10,20,30,1)",
      "transformPerspective",
    ),
    500,
  );
  for (const k of ["x", "y", "z", "rotateX", "rotateY", "rotateZ", "skewX"])
    assert.equal(p("none", k), 0);
  assert.equal(p(undefined, "scaleZ"), 1);
});
test("invalid matrices reject without poisoning subsequent parses", () => {
  for (const t of ["matrix(1,2)", "matrix(1,0,0,1,NaN,0)", "translateX(2px)"])
    assert.throws(() => api.parseValueFromTransform(t, "x"));
  assert.equal(api.parseValueFromTransform("matrix(1,0,0,1,3,0)", "x"), 3);
});
test("nested CSS variable fallbacks, zero and cycles are bounded", () => {
  const { node } = fixture({
    "--zero": "0",
    "--nested": "var(--zero)",
    "--cycle": "var(--cycle)",
  });
  assert.equal(api.getVariableValue("var(--nested)", node), 0);
  assert.equal(
    api.getVariableValue("var(--missing, var(--other, 12px))", node),
    "12px",
  );
  assert.equal(api.getVariableValue("var(--missing)", node), undefined);
  assert.throws(() => api.getVariableValue("var(--cycle)", node), /32 levels/);
  assert.throws(
    () => api.getVariableValue("var(not-custom)", node),
    /variable name/,
  );
});
test("base resolution snapshots and resolves initial values at start", () => {
  const frames = [null, null, 10],
    value = api.motionValue(2);
  let result;
  const r = new api.KeyframeResolver(
    frames,
    (...x) => (result = x),
    "opacity",
    value,
  );
  frames[2] = 99;
  value.set(3);
  r.scheduleResolve();
  assert.deepEqual(result, [[3, 3, 10], undefined, false]);
  assert.deepEqual(frames, [null, null, 99]);
  r.scheduleResolve();
  assert.equal(r.state, "complete");
});
test("base resolver reads initial missing MotionValue once", () => {
  const value = api.motionValue(undefined);
  let reads = 0,
    result;
  const r = new api.KeyframeResolver(
    [null, 20],
    (x) => (result = x),
    "width",
    value,
    {
      readValue() {
        reads++;
        return 12;
      },
    },
  );
  r.scheduleResolve();
  assert.equal(reads, 1);
  assert.equal(value.get(), 12);
  assert.deepEqual(result, [12, 20]);
});
test("queued resolution cancellation, resume and forced flushing", () => {
  const { node } = fixture({ opacity: ".2" });
  let calls = [];
  const r = new api.DOMKeyframesResolver(
    [null, 1],
    (...x) => calls.push(x),
    "opacity",
    undefined,
    { current: node },
  );
  r.scheduleResolve();
  assert.equal(r.state, "scheduled");
  r.cancel();
  api.flushKeyframeResolvers();
  assert.equal(calls.length, 0);
  r.resume();
  api.flushKeyframeResolvers();
  assert.deepEqual(calls, [[[0.2, 1], undefined, true]]);
  r.resume();
  assert.equal(calls.length, 1);
});
test("frame resolution and reentrant enqueue keep separate batches", () => {
  let log = [];
  const second = new api.KeyframeResolver(
    [0, 1],
    () => log.push("second"),
    undefined,
    undefined,
    undefined,
    true,
  );
  new api.KeyframeResolver(
    [0, 1],
    () => {
      log.push("first");
      second.scheduleResolve();
    },
    undefined,
    undefined,
    undefined,
    true,
  ).scheduleResolve();
  api.frameSteps.read.process({
    timestamp: 100,
    delta: 16,
    isProcessing: true,
  });
  assert.deepEqual(log, ["first"]);
  api.flushKeyframeResolvers();
  assert.deepEqual(log, ["first", "second"]);
});
test("failed reads and callbacks do not strand other queued resolvers", () => {
  let log = [];
  new api.KeyframeResolver(
    [null, 1],
    () => {},
    "x",
    undefined,
    {
      readValue() {
        throw Error("bad read");
      },
    },
    true,
  ).scheduleResolve();
  new api.KeyframeResolver(
    [0, 1],
    () => log.push("good"),
    undefined,
    undefined,
    undefined,
    true,
  ).scheduleResolve();
  assert.throws(() => api.flushKeyframeResolvers(), /bad read/);
  assert.deepEqual(log, ["good"]);
  new api.KeyframeResolver(
    [0, 1],
    () => {
      throw Error("bad callback");
    },
    undefined,
    undefined,
    undefined,
    true,
  ).scheduleResolve();
  new api.KeyframeResolver(
    [0, 1],
    () => log.push("later"),
    undefined,
    undefined,
    undefined,
    true,
  ).scheduleResolve();
  assert.throws(() => api.flushKeyframeResolvers(), /bad callback/);
  assert.deepEqual(log, ["good", "later"]);
});
test("variable endpoints preserve the final CSS token", () => {
  const { node } = fixture({ "--width": "40px", width: "20px" });
  let result;
  new api.DOMKeyframesResolver(
    [null, "var(--width)"],
    (...x) => (result = x),
    "width",
    undefined,
    { current: node },
  ).scheduleResolve();
  api.flushKeyframeResolvers();
  assert.deepEqual(result, [[20, 40], "var(--width)", true]);
});
test("temporary layout styles restore even when final measurement fails", () => {
  const { node, style } = fixture();
  node.style.setProperty("width", "20px", "important");
  let reads = 0;
  node.ownerDocument.defaultView.getComputedStyle = () => ({
    width: ++reads > 1 ? "auto" : "20px",
  });
  const r = new api.DOMKeyframesResolver(
    [null, "auto"],
    () => assert.fail("must not complete"),
    "width",
    undefined,
    { current: node },
  );
  r.scheduleResolve();
  assert.throws(() => api.flushKeyframeResolvers(), /pixel value/);
  assert.equal(style.get("width"), "20px");
  assert.equal(node.style.getPropertyPriority("width"), "important");
  assert.equal(r.state, "pending");
});
test("invalid unresolved input does not enqueue work", () => {
  for (const frames of [[], [null, null], [0, NaN]]) {
    if (frames.length === 2 && frames[0] === null)
      assert.throws(
        () => new api.KeyframeResolver(frames, () => {}).scheduleResolve(),
        /initial/,
      );
    else assert.throws(() => new api.KeyframeResolver(frames, () => {}));
  }
  api.flushKeyframeResolvers();
});
test("conflicting measurements resolve independently and restore styles", () => {
  const { node, style } = fixture();
  node.style.setProperty("width", "20px");
  node.ownerDocument.defaultView.getComputedStyle = () => ({
    width: style.get("width")?.endsWith("%")
      ? parseFloat(style.get("width")) * 4 + "px"
      : style.get("width"),
  });
  const results = [];
  for (const end of ["25%", "50%"])
    new api.DOMKeyframesResolver(
      [null, end],
      (x) => results.push(x),
      "width",
      undefined,
      { current: node },
    ).scheduleResolve();
  api.flushKeyframeResolvers();
  assert.deepEqual(results, [
    [20, 100],
    [20, 200],
  ]);
  assert.equal(style.get("width"), "20px");
});
test("falsy thrown values propagate after other resolvers finish", () => {
  for (const error of [undefined, null, 0, false, ""]) {
    let completed = false,
      caught = false;
    new api.KeyframeResolver(
      [0, 1],
      () => {
        throw error;
      },
      undefined,
      undefined,
      undefined,
      true,
    ).scheduleResolve();
    new api.KeyframeResolver(
      [0, 1],
      () => (completed = true),
      undefined,
      undefined,
      undefined,
      true,
    ).scheduleResolve();
    try {
      api.flushKeyframeResolvers();
    } catch (actual) {
      caught = true;
      assert.equal(actual, error);
    }
    assert.equal(caught, true);
    assert.equal(completed, true);
  }
});
test("temporary layout measurements restore their window scroll position", () => {
  const { node, style } = fixture();
  node.style.setProperty("height", "20px");
  const view = node.ownerDocument.defaultView;
  view.scrollX = 5;
  view.scrollY = 200;
  view.scrollTo = (x, y) => {
    view.scrollX = x;
    view.scrollY = y;
  };
  view.getComputedStyle = () => ({
    height: style.get("height") === "auto" ? "100px" : style.get("height"),
  });
  const set = node.style.setProperty;
  node.style.setProperty = (...args) => {
    set(...args);
    view.scrollY = 0;
  };
  let frames;
  new api.DOMKeyframesResolver(
    [null, "auto"],
    (x) => (frames = x),
    "height",
    undefined,
    { current: node },
  ).scheduleResolve();
  api.flushKeyframeResolvers();
  assert.deepEqual(frames, [20, 100]);
  assert.equal(style.get("height"), "20px");
  assert.equal(view.scrollX, 5);
  assert.equal(view.scrollY, 200);
});
