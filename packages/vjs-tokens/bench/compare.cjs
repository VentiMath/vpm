"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/source-map-conformance");
const upstream = path.join(fixture, "node_modules/js-tokens");
const code =
  "import {format} from './theme';\nconst tone = /[a-z]+/gi;\nexport const Summary = () => <Row title={format(12.5)} value={}/>;";
const cases = [
  {
    name: "Tokenize a JSX error excerpt",
    make(lib) {
      const api = require(lib);
      return () => {
        let m,
          total = 0;
        while ((m = api.default.exec(code)))
          total += api.matchToToken(m).value.length;
        return total;
      };
    },
    validate: (r) => assert.equal(r, code.length),
  },
  {
    name: "Babel colored build diagnostic",
    make(lib) {
      const staged = require(path.join(fixture, "tokens-fixture.cjs"))(
        lib,
        "code-frame-app",
      );
      process.once("exit", staged.close);
      const span = { start: { line: 3, column: 64 } },
        options = { forceColor: true, message: "Expected an expression" };
      return () => staged.frame.codeFrameColumns(code, span, options);
    },
    validate: (r) =>
      assert.ok(r.includes("\x1b[") && r.includes("Expected an expression")),
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm: root,
    cases,
    files: [
      "index.cjs",
      "scanner.cjs",
      "bench/compare.cjs",
      "../../scripts/source-map-conformance/tokens-fixture.cjs",
      "../../scripts/source-map-conformance/package-lock.json",
      path.relative(root, path.join(upstream, "index.js")),
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
