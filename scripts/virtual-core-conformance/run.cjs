"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path");
const candidate = require(
  process.env.VPM_VIRTUAL_ENTRY ||
    path.resolve(__dirname, "../../packages/vtanstack-virtual-core"),
);
const current = require("@tanstack/virtual-core"),
  old = require("virtual-core-app");
let seed = 719113;
const random = (n) =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % n;
function options(extra = {}) {
  return {
    count: 100,
    getScrollElement: () => null,
    estimateSize: (i) => 20 + (i % 7),
    initialRect: { width: 300, height: 200 },
    scrollToFn() {},
    observeElementRect() {},
    observeElementOffset() {},
    ...extra,
  };
}
let checks = 0;
for (let c = 0; c < 400; c++) {
  const count = random(500),
    opts = options({
      count,
      overscan: random(7),
      paddingStart: random(20),
      paddingEnd: random(20),
      gap: random(5),
      scrollMargin: random(20),
      horizontal: !!random(2),
      initialOffset: random(6000),
      getItemKey: (i) => "row" + i,
      initialRect: { width: 40 + random(400), height: 40 + random(400) },
    });
  const a = new candidate.Virtualizer(opts),
    b = new current.Virtualizer({ ...opts }),
    d = new old.Virtualizer({ ...opts });
  for (let step = 0; step < 5; step++) {
    for (const control of [b, d]) {
      if (
        control === b ||
        opts.initialOffset <=
          Math.max(
            0,
            a.getTotalSize() +
              opts.scrollMargin -
              opts.initialRect[opts.horizontal ? "width" : "height"],
          )
      ) {
        assert.deepEqual(a.getVirtualItems(), control.getVirtualItems());
        checks++;
      }
      assert.equal(a.getTotalSize(), control.getTotalSize());
      checks++;
      for (const offset of [0, 12, 145, 2000]) {
        assert.deepEqual(
          a.getVirtualItemForOffset(offset),
          control.getVirtualItemForOffset(offset),
        );
        checks++;
      }
    }
    if (count) {
      const index = random(count),
        size = random(100);
      for (const v of [a, b, d]) {
        v.shouldAdjustScrollPositionOnItemSizeChange = () => false;
        v.resizeItem(index, size);
      }
    }
  }
}
// Current API behavior after resizing above the viewport folds the correction
// into scrollOffset immediately; the app's older control only changes the DOM.
const a = new candidate.Virtualizer(options({ initialOffset: 200 })),
  b = new current.Virtualizer(options({ initialOffset: 200 }));
for (const v of [a, b]) {
  v.getVirtualItems();
  v.resizeItem(0, 37);
}
assert.equal(a.scrollOffset, b.scrollOffset);
assert.deepEqual(a.getVirtualItems(), b.getVirtualItems());
for (const lib of [candidate, current]) {
  const v = new lib.Virtualizer(options({ initialOffset: 0 }));
  v.getVirtualItems();
  v.resizeItem(3, 87);
  const snapshot = v.takeSnapshot();
  assert.equal(snapshot.length, 1);
  assert.equal(snapshot[0].index, 3);
  const restored = new lib.Virtualizer(
    options({ initialMeasurementsCache: snapshot }),
  );
  assert.equal(restored.getTotalSize(), v.getTotalSize());
}
console.log(
  checks +
    " current/app geometry, range and resize comparisons pass; current correction and snapshot contracts pass.",
);
module.exports = { options };
