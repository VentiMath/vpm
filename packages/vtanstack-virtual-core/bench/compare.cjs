"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/virtual-core-conformance");
const common = (count) => ({
  count,
  estimateSize: () => 37,
  getScrollElement: () => null,
  initialRect: { width: 800, height: 600 },
  initialOffset: 740,
  scrollToFn() {},
  observeElementRect() {},
  observeElementOffset() {},
});
const cases = [
  {
    name: "Build 10,000-row geometry",
    make(file) {
      const { Virtualizer } = require(file);
      return () => new Virtualizer(common(10000)).getTotalSize();
    },
    validate: (value) => assert.equal(value, 370000),
  },
  {
    name: "Unchanged visible items",
    make(file) {
      const { Virtualizer } = require(file),
        v = new Virtualizer(common(10000));
      v.getVirtualItems();
      return () => v.getVirtualItems();
    },
    validate: (value) => assert.ok(value.length >= 16 && value.length <= 20),
  },
  {
    name: "Scrolling viewport",
    make(file) {
      const { Virtualizer } = require(file),
        v = new Virtualizer(common(10000));
      v.getVirtualItems();
      let at = 0;
      return () => {
        v.scrollOffset = (++at % 9000) * 37;
        return v.getVirtualItems();
      };
    },
    validate: (value) => assert.ok(value.length >= 16 && value.length <= 20),
  },
  {
    name: "Resize row and recompute suffix",
    make(file) {
      const { Virtualizer } = require(file),
        v = new Virtualizer(common(10000));
      v.getVirtualItems();
      v.shouldAdjustScrollPositionOnItemSizeChange = () => false;
      let flip = false;
      return () => {
        v.resizeItem(17, (flip = !flip) ? 40 : 37);
        return v.getTotalSize();
      };
    },
    validate: (value) => assert.ok(value === 370000 || value === 370003),
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: require.resolve(
      path.join(fixture, "node_modules/@tanstack/virtual-core"),
    ),
    vpm: root,
    cases,
    files: [
      "index.cjs",
      "index.mjs",
      "index.d.cts",
      "index.d.mts",
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../../scripts/virtual-core-conformance/package-lock.json",
      "../../scripts/virtual-core-conformance/node_modules/@tanstack/virtual-core/dist/cjs/index.cjs",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
