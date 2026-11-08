"use strict";
const dom = require("./dom.cjs")(),
  assert = require("node:assert/strict"),
  path = require("node:path");
const React = require("react"),
  { createRoot } = require("react-dom/client");
const variant = process.argv[2] || "vpm",
  isVpm = variant === "vpm";
const api = isVpm
  ? require("./load.cjs")(
      process.env.VPM_SWIPEABLE_ENTRY ||
        path.resolve(__dirname, "../../packages/vreact-swipeable"),
    )
  : require("react-swipeable");
const results = {};
function fixture(props = {}, doc = document, strict = false) {
  const host = doc.createElement("div");
  doc.body.append(host);
  const root = createRoot(host);
  let options = props,
    tag = "div";
  function View() {
    const handlers = api.useSwipeable(options);
    return React.createElement(tag, { ...handlers, "data-swipe": true });
  }
  const render = () =>
    React.act(() =>
      root.render(
        strict
          ? React.createElement(
              React.StrictMode,
              null,
              React.createElement(View),
            )
          : React.createElement(View),
      ),
    );
  render();
  return {
    host,
    node: () => host.firstChild,
    set(next) {
      options = next;
      render();
    },
    replace() {
      tag = "section";
      render();
    },
    unmount() {
      React.act(() => root.unmount());
      host.remove();
    },
  };
}
function event(
  node,
  type,
  { x = 100, y = 100, time = 1, id = 1, count = 1 } = {},
) {
  const touch = type.startsWith("touch");
  const e = new (
    touch
      ? node.ownerDocument.defaultView.Event
      : node.ownerDocument.defaultView.MouseEvent
  )(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
  });
  Object.defineProperty(e, "timeStamp", { value: time });
  if (touch) {
    Object.defineProperty(e, "touches", {
      value:
        type === "touchend" || type === "touchcancel"
          ? []
          : Array.from({ length: count }, (_, i) => ({
              clientX: x,
              clientY: y,
              identifier: id + i,
            })),
    });
    Object.defineProperty(e, "changedTouches", {
      value: [{ clientX: x, clientY: y, identifier: id }],
    });
  }
  React.act(() => node.dispatchEvent(e));
  return e;
}
function swipeStart(f) {
  event(f.node(), "touchstart", { time: 1 });
  event(f.node(), "touchmove", { x: 140, time: 11 });
}
try {
  for (const cancel of ["touchcancel", "second-finger"]) {
    let calls = 0;
    const f = fixture({ onSwiped: () => calls++ });
    swipeStart(f);
    event(f.node(), cancel === "touchcancel" ? "touchcancel" : "touchmove", {
      x: 150,
      time: 15,
      count: 2,
    });
    event(f.node(), "touchend", { time: 20 });
    results[cancel] = calls;
    if (isVpm) assert.equal(calls, 0);
    f.unmount();
  }
  for (const action of ["unmount", "replace", "disable-mouse", "window-blur"]) {
    let calls = 0;
    const f = fixture({
      trackMouse: true,
      onSwiping: () => calls++,
      onSwiped: () => calls++,
    });
    event(f.node(), "mousedown");
    if (action === "unmount") f.unmount();
    else if (action === "replace") f.replace();
    else if (action === "disable-mouse")
      f.set({
        trackMouse: false,
        onSwiping: () => calls++,
        onSwiped: () => calls++,
      });
    else window.dispatchEvent(new Event("blur"));
    event(document.body, "mousemove", { x: 150, time: 10 });
    event(document.body, "mouseup", { x: 150, time: 20 });
    results[action] = calls;
    if (isVpm) assert.equal(calls, 0);
    if (action !== "unmount") f.unmount();
  }
  {
    let end;
    const f = fixture({
      onSwiping: (d) => {
        d.initial[0] = 999;
        d.deltaX = 999;
        d.dir = "Left";
      },
      onSwiped: (d) => (end = d),
    });
    swipeStart(f);
    event(f.node(), "touchmove", { x: 160, time: 20 });
    event(f.node(), "touchend", { time: 30 });
    results["callback-mutation"] = end?.deltaX;
    if (isVpm) {
      assert.equal(end.deltaX, 60);
      assert.deepEqual(end.initial, [100, 100]);
      assert.equal(end.dir, "Right");
    }
    f.unmount();
  }
  {
    let taps = 0;
    const f = fixture({ swipeDuration: 10, onTap: () => taps++ });
    event(f.node(), "touchstart", { time: 1 });
    event(f.node(), "touchmove", { x: 140, time: 20 });
    event(f.node(), "touchend", { time: 30 });
    results["expired-tap"] = taps;
    if (isVpm) assert.equal(taps, 0);
    f.unmount();
  }
  {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    let calls = 0;
    const f = fixture(
      { trackMouse: true, onSwipedRight: () => calls++ },
      frame.contentDocument,
    );
    event(f.node(), "mousedown");
    event(frame.contentDocument.body, "mousemove", { x: 150, time: 10 });
    event(frame.contentDocument.body, "mouseup", { time: 20 });
    results.iframe = calls;
    if (isVpm) assert.equal(calls, 1);
    f.unmount();
    frame.remove();
  }
  {
    let calls = 0;
    const f = fixture({ onSwipedRight: () => calls++ }, document, true);
    swipeStart(f);
    event(f.node(), "touchend", { time: 20 });
    results.strictMode = calls;
    assert.equal(calls, 1);
    f.unmount();
  }
  {
    let calls = 0;
    const f = fixture({ onSwipedRight: () => calls++ });
    event(f.node(), "touchstart", { time: 1 });
    event(f.node(), "touchmove", { x: 120, time: 10, id: 9 });
    event(f.node(), "touchend", { time: 20 });
    results["changed-finger"] = calls;
    if (isVpm) assert.equal(calls, 0);
    f.unmount();
  }
  {
    let calls = 0;
    const f = fixture({ onTap: () => calls++ });
    event(f.node(), "touchend", { time: 20 });
    results["orphan-end"] = calls;
    if (isVpm) assert.equal(calls, 0);
    f.unmount();
  }
  if (!isVpm)
    assert.deepEqual(results, {
      touchcancel: 1,
      "second-finger": 1,
      unmount: 2,
      replace: 2,
      "disable-mouse": 2,
      "window-blur": 2,
      "callback-mutation": 999,
      "expired-tap": 1,
      iframe: 0,
      strictMode: 1,
      "changed-finger": 1,
      "orphan-end": 1,
    });
  console.log(variant, JSON.stringify(results));
} finally {
  dom.window.close();
}
