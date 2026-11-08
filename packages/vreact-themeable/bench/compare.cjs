"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/themeable-conformance"),
  upstream = path.join(fixture, "node_modules/react-themeable");
const load = require(path.join(fixture, "load.cjs"));
const classes = {
  input: "Input",
  inputOpen: "Open",
  inputFocused: "Focused",
  container: "Container",
  containerOpen: "Visible",
  item: "Item",
  itemFirst: "First",
  itemHighlighted: "Selected",
};
const styles = {
  a: { color: "red", fontSize: 14 },
  b: { color: "blue", fontWeight: 600 },
  c: { opacity: 0.8, padding: 4 },
};
const cases = [
  {
    name: "create class-theme helper",
    make(file) {
      const create = require(file);
      return () => create(classes);
    },
    validate: (x) => assert.equal(typeof x, "function"),
  },
  {
    name: "search input classes",
    make(file) {
      const theme = require(file)(classes);
      let i = 0;
      return () =>
        theme(
          "input",
          "input",
          i++ % 2 && "inputOpen",
          i % 3 && "inputFocused",
        );
    },
    validate: (x) => assert.equal(typeof x.className, "string"),
  },
  {
    name: "selected suggestion classes",
    make(file) {
      const theme = require(file)(classes);
      let i = 0;
      return () =>
        theme(i++, "item", i % 2 && "itemFirst", i % 3 && "itemHighlighted");
    },
    validate: (x) => assert.equal(typeof x.className, "string"),
  },
  {
    name: "merge three inline styles",
    make(file) {
      const theme = require(file)(styles);
      return () => theme("style", "a", "b", "c");
    },
    validate: (x) =>
      assert.deepEqual(x.style, {
        color: "blue",
        fontSize: 14,
        fontWeight: 600,
        opacity: 0.8,
        padding: 4,
      }),
  },
  {
    name: "decorated styles",
    make(file) {
      const theme = require(file)([
        styles,
        (...values) => values.map((x) => Object.keys(x).join("-")).join(" "),
      ]);
      return () => theme("decorated", "a", "b");
    },
    validate: (x) => assert.equal(typeof x.className, "string"),
  },
  {
    name: "empty selections",
    make(file) {
      const theme = require(file)(classes);
      return () => theme("empty", false, "missing", null);
    },
    validate: (x) => assert.deepEqual(x, { key: "empty", style: {} }),
  },
  {
    name: "actual autosuggest render tree",
    make(file) {
      const C = load(file);
      const props = {
        ...C.defaultProps,
        theme: { ...C.defaultProps.theme, ...classes },
        items: ["one", "two", "three"],
        highlightedItemIndex: 1,
        inputProps: { value: "query", onChange() {} },
      };
      const instance = new C(props);
      return () => instance.render();
    },
    validate: (x) => assert.equal(x.type, "div"),
  },
];
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
      "../../scripts/themeable-conformance/load.cjs",
      "../../scripts/themeable-conformance/package-lock.json",
      "../../scripts/themeable-conformance/node_modules/react-themeable",
      "../../scripts/themeable-conformance/node_modules/object-assign",
      "../../scripts/themeable-conformance/node_modules/react-autosuggest/dist",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
