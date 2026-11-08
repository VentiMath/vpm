"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/autosuggest-widget-conformance");
const React = require(path.join(fixture, "node_modules/react")),
  render = require(
    path.join(fixture, "node_modules/react-dom/server"),
  ).renderToStaticMarkup;
const load = require(path.join(fixture, "load.cjs"));
const cases = [
  { name: "closed navigation widget", count: 0, always: false },
  { name: "ten navigation suggestions", count: 10, always: true },
  {
    name: "two sections with ten suggestions",
    count: 5,
    always: true,
    grouped: true,
  },
].map(({ name, count, always, grouped }) => ({
  name,
  make(file) {
    const C = load(file),
      rows = Array.from({ length: count }, (_, i) => ({
        title: "Navigation " + i,
      }));
    const props = {
      suggestions: grouped ? [{ items: rows }, { items: rows }] : rows,
      multiSection: !!grouped,
      getSectionSuggestions: (x) => x.items,
      renderSectionTitle: () => null,
      alwaysRenderSuggestions: always,
      getSuggestionValue: (x) => x.title,
      renderSuggestion: (x, { query, isHighlighted }) =>
        React.createElement(
          "span",
          { "data-query": query, "data-highlighted": isHighlighted },
          x.title,
        ),
      inputProps: { value: "Nav", onChange() {} },
      onSuggestionsFetchRequested() {},
      onSuggestionsClearRequested() {},
    };
    return () => render(React.createElement(C, props));
  },
  validate: (x) => assert.ok(x.includes('role="combobox"')),
}));
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.join(fixture, "node_modules/react-autosuggest"),
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
      "../../scripts/autosuggest-widget-conformance/load.cjs",
      "../../scripts/autosuggest-widget-conformance/package-lock.json",
      "../../scripts/autosuggest-widget-conformance/node_modules/react-autosuggest/dist",
      "../../packages/vreact-themeable/index.cjs",
      "../../packages/vsection-iterator/index.cjs",
      "../../packages/vshallow-equal/index.cjs",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
