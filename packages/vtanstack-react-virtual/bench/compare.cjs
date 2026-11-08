"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/react-virtual-conformance");
const { load, peer } = require(path.join(fixture, "load.cjs"));
const React = peer("react"),
  render = peer("react-dom/server").renderToStaticMarkup;
const sameCore = require(path.resolve(root, "../vtanstack-virtual-core"));
const cases = [
  ["SSR empty element list", 0, "useVirtualizer", false],
  ["SSR 10,000-row viewport", 10000, "useVirtualizer", false],
  ["SSR window viewport", 1000, "useWindowVirtualizer", false],
  ["SSR adapter only, same core", 1000, "useVirtualizer", true],
].map(([name, count, hook, controlled]) => ({
  name,
  make(file) {
    const api = load(file, controlled ? sameCore : undefined);
    function View() {
      const v = api[hook]({
        count,
        estimateSize: () => 37,
        getScrollElement: () => null,
        initialRect: { width: 800, height: 600 },
        initialOffset: 740,
      });
      return React.createElement(
        "main",
        { "data-total": v.getTotalSize() },
        v
          .getVirtualItems()
          .map((x) => React.createElement("span", { key: x.key }, x.index)),
      );
    }
    return () => render(React.createElement(View));
  },
  validate(value) {
    assert.ok(value.startsWith("<main"));
    assert.ok(value.includes('data-total="' + count * 37 + '"'));
  },
}));
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: require.resolve(
      path.join(fixture, "node_modules/@tanstack/react-virtual"),
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
      "../vtanstack-virtual-core/index.cjs",
      "../../scripts/react-virtual-conformance/load.cjs",
      "../../scripts/react-virtual-conformance/package-lock.json",
      "../../scripts/react-virtual-conformance/node_modules/@tanstack/react-virtual/dist/cjs/index.cjs",
      "../../scripts/react-virtual-conformance/node_modules/@tanstack/virtual-core/dist/cjs/index.cjs",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
