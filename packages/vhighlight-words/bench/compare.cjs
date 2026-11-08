"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/highlight-words-conformance");
const upstream = path.join(fixture, "node_modules/highlight-words");
const cases = [];
for (const [name, options] of [
  ["short cell, no match", { text: "Algebra study guide", query: "geometry" }],
  ["short cell, single match", { text: "Algebra study guide", query: "study" }],
  [
    "cell, multiword filter",
    {
      text: "Advanced algebra and geometry study guide",
      query: "algebra geometry",
    },
  ],
  [
    "context clipping",
    {
      text: "Before the algebra lesson with several intermediate concepts and after the geometry lesson ends",
      query: "algebra geometry",
      clipBy: 2,
    },
  ],
  [
    "long text, captured regex",
    { text: "Alpha beta gamma delta ".repeat(40), query: /(alpha|gamma)/gi },
  ],
])
  cases.push({
    name,
    make(file) {
      const api = require(file).default;
      return () => api(options);
    },
    validate(out) {
      assert(Array.isArray(out));
      assert(
        out.every(
          (c) =>
            typeof c.text === "string" &&
            typeof c.match === "boolean" &&
            typeof c.key === "string",
        ),
      );
      if (!options.clipBy)
        assert.equal(out.map((c) => c.text).join(""), options.text);
    },
  });
cases.push({
  name: "actual MRT cell SSR",
  make(file) {
    const React = require(path.join(fixture, "node_modules/react")),
      render = require(
        path.join(fixture, "node_modules/react-dom/server"),
      ).renderToStaticMarkup,
      Cell = require(path.join(fixture, "load.cjs"))(file),
      props = require(path.join(fixture, "props.cjs"))({
        text: "Algebra study guide",
        query: "study",
      });
    return () => render(React.createElement(Cell, props));
  },
  validate(s) {
    assert.match(s, /aria-label="Algebra study guide"/);
    assert.match(s, />study</);
  },
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
      "../../scripts/highlight-words-conformance/load.cjs",
      "../../scripts/highlight-words-conformance/props.cjs",
      "../../scripts/highlight-words-conformance/build.cjs",
      "../../scripts/highlight-words-conformance/package-lock.json",
      "../../scripts/highlight-words-conformance/node_modules/highlight-words",
      "../../scripts/highlight-words-conformance/node_modules/material-react-table/src/components/body/MRT_TableBodyCellValue.tsx",
      "../../scripts/highlight-words-conformance/node_modules/.vpm-highlight/caller.cjs",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
