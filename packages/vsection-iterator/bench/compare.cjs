"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/section-iterator-conformance"),
  upstream = path.join(fixture, "node_modules/section-iterator");
const load = require(path.join(fixture, "load.cjs"));
const cases = [];
for (const [name, data, multiSection] of [
  ["create flat ten-item iterator", 10, false],
  ["create grouped iterator", [0, 3, 0, 4, 1, 0], true],
])
  cases.push({
    name,
    make(file) {
      const create = require(file);
      return () => create({ data, multiSection });
    },
    validate: (i) => assert.equal(typeof i.next, "function"),
  });
for (const [name, data, multiSection] of [
  ["flat keyboard cycle", 10, false],
  ["grouped keyboard cycle", [0, 3, 0, 4, 1, 0], true],
  ["cross 200 empty sections", [1, ...Array(200).fill(0), 1], true],
])
  cases.push({
    name,
    make(file) {
      const iterator = require(file)({ data, multiSection });
      let p = [null, null];
      return () => (p = iterator.next(p));
    },
    validate: (p) => assert(Array.isArray(p) && p.length === 2),
  });
cases.push({
  name: "last-item checks",
  make(file) {
    const iterator = require(file)({
      data: [0, 3, 0, 4, 1, 0],
      multiSection: true,
    });
    const inputs = [
      [null, null],
      [1, 0],
      [3, 3],
      [4, 0],
    ];
    let i = 0;
    return () => iterator.isLast(inputs[i++ % inputs.length]);
  },
  validate: (x) => assert.equal(typeof x, "boolean"),
});
cases.push({
  name: "actual autosuggest key handler",
  make(file) {
    const C = load(file);
    let c;
    const props = {
      ...C.defaultProps,
      items: Array.from({ length: 10 }, (_, i) => String(i)),
      inputProps: {
        onKeyDown(_event, p) {
          c.props = {
            ...c.props,
            highlightedSectionIndex: p.newHighlightedSectionIndex,
            highlightedItemIndex: p.newHighlightedItemIndex,
          };
        },
      },
    };
    c = new C(props);
    const event = { keyCode: 40 };
    return () => {
      c.onKeyDown(event);
      return c.props.highlightedItemIndex;
    };
  },
  validate: (x) => assert(x === null || Number.isInteger(x)),
});
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm: root,
    cases,
    files: [
      "package.json",
      "PROVENANCE.json",
      "index.cjs",
      "index.mjs",
      "index.d.cts",
      "index.d.mts",
      "bench/compare.cjs",
      "../../scripts/section-iterator-conformance/load.cjs",
      "../../scripts/section-iterator-conformance/package-lock.json",
      "../../scripts/section-iterator-conformance/node_modules/section-iterator",
      "../../scripts/section-iterator-conformance/node_modules/react-autosuggest/dist",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
