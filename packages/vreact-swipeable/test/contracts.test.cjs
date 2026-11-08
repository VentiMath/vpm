"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  create = require("../gesture.cjs");
class Target extends EventTarget {
  constructor() {
    super();
    this.live = new Map();
  }
  addEventListener(type, fn, opts) {
    super.addEventListener(type, fn, opts);
    if (!this.live.has(type)) this.live.set(type, new Set());
    this.live.get(type).add(fn);
  }
  removeEventListener(type, fn, opts) {
    super.removeEventListener(type, fn, opts);
    this.live.get(type)?.delete(fn);
  }
  count() {
    return [...this.live.values()].reduce((n, s) => n + s.size, 0);
  }
}
function target() {
  const node = new Target(),
    doc = new Target(),
    win = new Target();
  doc.defaultView = win;
  node.ownerDocument = doc;
  return { node, doc, win };
}
function send(node, type, x = 100, y = 100, time = 1, count = 1) {
  const e = new Event(type, { cancelable: true });
  Object.defineProperties(e, {
    clientX: { value: x },
    clientY: { value: y },
    timeStamp: { value: time },
  });
  if (type.startsWith("touch"))
    Object.defineProperty(e, "touches", {
      value:
        type === "touchend"
          ? []
          : Array.from({ length: count }, (_, i) => ({
              identifier: i,
              clientX: x,
              clientY: y,
            })),
    });
  node.dispatchEvent(e);
  return e;
}
test("direction thresholds and post-threshold reversals", () => {
  let data;
  const { node } = target();
  const c = create({ delta: { right: 20 }, onSwiped: (d) => (data = d) });
  c.ref(node);
  send(node, "touchstart");
  send(node, "touchmove", 119, 100, 5);
  send(node, "touchend", 0, 0, 6);
  assert.equal(data, undefined);
  send(node, "touchstart");
  send(node, "touchmove", 120, 100, 5);
  send(node, "touchmove", 99, 100, 6);
  send(node, "touchend", 0, 0, 7);
  assert.equal(data.dir, "Left");
  assert.equal(data.deltaX, -1);
  c.suspend();
  assert.equal(node.count(), 0);
});
test("mouse listeners belong to target document and clean up before callbacks", () => {
  const { node, doc, win } = target();
  let c;
  c = create({
    trackMouse: true,
    onSwiped() {
      assert.equal(doc.count(), 0);
      assert.equal(win.count(), 0);
    },
  });
  c.ref(node);
  c.mouseDown({ clientX: 0, clientY: 0, timeStamp: 1, button: 0 });
  assert.equal(doc.count(), 2);
  assert.equal(win.count(), 1);
  send(doc, "mousemove", 50, 0, 10);
  send(doc, "mouseup", 0, 0, 20);
  assert.equal(doc.count(), 0);
  c.suspend();
  assert.equal(node.count(), 0);
});
test("callback ref handoff preserves a gesture only on the same node", async () => {
  const { node } = target();
  let calls = 0;
  const c = create({ onSwiped: () => calls++ });
  c.ref(node);
  send(node, "touchstart");
  c.ref(null);
  send(node, "touchmove", 160, 100, 10);
  c.ref(node);
  send(node, "touchmove", 160, 100, 15);
  send(node, "touchend", 0, 0, 20);
  assert.equal(calls, 1);
  c.ref(null);
  await Promise.resolve();
  assert.equal(node.count(), 0);
});
test("cancellation, disabling and replacement cannot complete stale gestures", () => {
  for (const action of ["cancel", "disable", "replace"]) {
    const { node } = target();
    let calls = 0;
    const opts = { onSwiped: () => calls++, onTap: () => calls++ };
    const c = create(opts);
    c.ref(node);
    send(node, "touchstart");
    send(node, "touchmove", 140, 100, 10);
    if (action === "cancel") send(node, "touchcancel");
    else if (action === "disable") c.configure({ ...opts, trackTouch: false });
    else c.ref(target().node);
    send(node, "touchend", 0, 0, 20);
    assert.equal(calls, 0);
    c.suspend();
  }
});
test("expired gestures are not taps; public data mutation leaves tracking intact", () => {
  const { node } = target();
  let end,
    taps = 0;
  const c = create({
    swipeDuration: 10,
    onTap: () => taps++,
    onSwiped: (d) => (end = d),
  });
  c.ref(node);
  send(node, "touchstart");
  send(node, "touchend", 0, 0, 20);
  assert.equal(taps, 0);
  c.configure({
    onSwiping: (d) => {
      d.initial[0] = 999;
      d.dir = "Down";
    },
    onSwiped: (d) => (end = d),
  });
  send(node, "touchstart");
  send(node, "touchmove", 140, 100, 5);
  send(node, "touchend", 0, 0, 6);
  assert.equal(end.dir, "Right");
  assert.deepEqual(end.initial, [100, 100]);
  c.suspend();
});
test("scroll prevention is opt-in and limited to handled directions", () => {
  const { node } = target();
  const c = create({ preventScrollOnSwipe: true, onSwipedRight() {} });
  c.ref(node);
  send(node, "touchstart");
  assert.equal(send(node, "touchmove", 80, 100, 5).defaultPrevented, false);
  assert.equal(send(node, "touchmove", 140, 100, 6).defaultPrevented, true);
  c.suspend();
});

test("detachment inside onSwipeStart suppresses the rest of that move", async () => {
  const { node } = target();
  let moves = 0,
    c;
  c = create({
    onSwipeStart() {
      c.ref(null);
    },
    onSwiping() {
      moves++;
    },
  });
  c.ref(node);
  send(node, "touchstart");
  send(node, "touchmove", 140, 100, 10);
  assert.equal(moves, 0);
  await Promise.resolve();
  assert.equal(node.count(), 0);
});
