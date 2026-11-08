"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const core = require("../index.cjs");
const base = (extra) => ({
  count: 100,
  getScrollElement: () => null,
  estimateSize: () => 20,
  initialRect: { width: 200, height: 100 },
  scrollToFn() {},
  observeElementRect() {},
  observeElementOffset() {},
  ...extra,
});
test("geometry, size invalidation and keyed snapshots", () => {
  const v = new core.Virtualizer(
    base({
      gap: 2,
      paddingStart: 7,
      paddingEnd: 9,
      getItemKey: (i) => "k" + i,
    }),
  );
  assert.equal(v.getTotalSize(), 2214);
  assert.equal(v.getVirtualItems()[0].start, 7);
  v.resizeItem(2, 45);
  const saved = v.takeSnapshot();
  assert.deepEqual(saved, [
    { index: 2, key: "k2", start: 51, size: 45, end: 96, lane: 0 },
  ]);
  saved[0].size = 2;
  assert.equal(v.getVirtualItems()[2].size, 45);
  v.setOptions(base({ count: 1, getItemKey: (i) => "k" + (i + 2) }));
  assert.equal(v.getTotalSize(), 45);
  v.measure();
  assert.equal(v.getTotalSize(), 20);
  v.setOptions(base({ enabled: false }));
  assert.deepEqual(v.getVirtualItems(), []);
});
test("does not mutate frozen options; rejects invalid or unsupported layout", () => {
  const opts = Object.freeze(base({ overscan: undefined }));
  const v = new core.Virtualizer(opts);
  assert.equal(v.options.overscan, 1);
  assert.equal(Object.hasOwn(opts, "overscan"), true);
  for (const patch of [
    { count: -1 },
    { count: 1.2 },
    { overscan: -1 },
    { gap: NaN },
    { lanes: 2 },
    { anchorTo: "end" },
    { followOnAppend: true },
  ])
    assert.throws(() => new core.Virtualizer(base(patch)), RangeError);
  assert.throws(
    () =>
      new core.Virtualizer(
        base({ estimateSize: () => Infinity }),
      ).getTotalSize(),
    RangeError,
  );
  assert.throws(() => v.resizeItem(1, -1), RangeError);
});
function realm() {
  const frames = new Map(),
    observers = [];
  let next = 0;
  const win = {
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (fn) => {
      frames.set(++next, fn);
      return next;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    ResizeObserver: class {
      constructor(cb) {
        this.cb = cb;
        this.nodes = new Set();
        observers.push(this);
      }
      observe(n) {
        this.nodes.add(n);
      }
      unobserve(n) {
        this.nodes.delete(n);
      }
      disconnect() {
        this.nodes.clear();
      }
    },
  };
  const element = new EventTarget();
  Object.assign(element, {
    ownerDocument: { defaultView: win },
    clientWidth: 200,
    clientHeight: 100,
    scrollHeight: 2000,
    scrollWidth: 200,
    scrollTop: 0,
    scrollLeft: 0,
    scrollTo({ top = 0 }) {
      this.scrollTop = top;
    },
  });
  return { win, element, frames, observers };
}
test("owner lifecycle rejects late observer callbacks and releases scheduled frames", () => {
  const { element, frames, observers } = realm();
  let calls = 0;
  const v = new core.Virtualizer(
    base({
      getScrollElement: () => element,
      observeElementRect: core.observeElementRect,
      observeElementOffset: core.observeElementOffset,
      scrollToFn: core.elementScroll,
      useAnimationFrameWithResizeObserver: true,
      onChange: () => calls++,
    }),
  );
  const cleanup = v._didMount();
  v._willUpdate();
  assert.equal(observers.length, 2);
  const node = {
    ownerDocument: element.ownerDocument,
    isConnected: true,
    getAttribute: () => "0",
    offsetHeight: 23,
  };
  v.measureElement(node);
  observers[0].cb([]);
  observers[1].cb([
    { target: node, borderBoxSize: [{ blockSize: 39, inlineSize: 50 }] },
  ]);
  assert.ok(frames.size);
  cleanup();
  const before = calls;
  assert.equal(frames.size, 0);
  assert.ok(observers.every((x) => x.nodes.size === 0));
  observers[1].cb([
    { target: node, borderBoxSize: [{ blockSize: 90, inlineSize: 50 }] },
  ]);
  // Stale callbacks must not even queue a new frame after unmount.
  assert.equal(frames.size, 0);
  assert.equal(calls, before);
  v._didMount();
  v._willUpdate();
  assert.equal(observers.length, 4);
  v._didMount()();
});
test("scroll reset timer is cancelled on unsubscribe", async () => {
  const { element, win } = realm();
  let calls = 0;
  const stop = core.observeElementOffset(
    {
      scrollElement: element,
      targetWindow: win,
      options: { horizontal: false, isRtl: false, isScrollingResetDelay: 5 },
    },
    () => calls++,
  );
  element.dispatchEvent(new Event("scroll"));
  assert.equal(calls, 1);
  stop();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(calls, 1);
});
test("RTL writes use the same logical positive coordinates as offset reads", () => {
  let left;
  core.elementScroll(
    40,
    { adjustments: 5 },
    {
      options: { horizontal: true, isRtl: true },
      scrollElement: {
        ownerDocument: {},
        scrollTo(value) {
          left = value.left;
        },
      },
    },
  );
  assert.equal(left, -45);
});
test("zero-size detail rows, filtered range and custom retained indexes", () => {
  const v = new core.Virtualizer(
    base({
      count: 20,
      estimateSize: (i) => (i % 2 ? 0 : 40),
      initialOffset: 4000,
      rangeExtractor: (r) => [0, ...core.defaultRangeExtractor(r)],
    }),
  );
  const visible = v.getVirtualItems();
  assert.equal(visible[0].index, 0);
  assert.ok(visible.at(-1).end >= 400);
  assert.ok(v.range.startIndex < 19);
});

test("measurement changes report asynchronous adapter updates during scrolling", () => {
  const changes = [];
  const v = new core.Virtualizer(
    base({ onChange: (_, sync) => changes.push(sync) }),
  );
  v.getVirtualItems();
  v.isScrolling = true;
  v.resizeItem(0, 30);
  assert.deepEqual(changes, [false]);
});
