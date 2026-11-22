"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/source-map-conformance");
const upstream = path.join(fixture, "node_modules/code-frame-app");
const source =
  "import {format} from './theme';\nconst match = /[a-z]+/gi;\nexport const Result = () => <Row value={}/>;";
const cases = [
  {
    name: "Highlight a JSX diagnostic",
    make(lib) {
      const api = require(lib);
      return () => api.highlight(source);
    },
    validate: (r) => assert.ok(r.includes("\x1b[") && r.includes("Result")),
  },
  ...[false, true].map((forceColor) => ({
    name: forceColor ? "Colored source frame" : "Plain source frame",
    make(lib) {
      const api = require(lib);
      const loc = { start: { line: 3, column: 37 } };
      return () =>
        api.codeFrameColumns(source, loc, {
          forceColor,
          message: "Expected an expression",
        });
    },
    validate: (r) =>
      assert.ok(r.includes("^") && r.includes("Expected an expression")),
  })),
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm: root,
    cases,
    files: [
      "frame.cjs",
      "index.cjs",
      "bench/compare.cjs",
      path.relative(root, path.join(upstream, "lib/index.js")),
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
