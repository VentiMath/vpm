"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const upstream = require("node:module")
  .createRequire(
    require.resolve("../../../scripts/source-map-conformance/package.json"),
  )
  .resolve("jsesc");
const root = path.resolve(__dirname, "..");
const cases = [
  ["Short ASCII label", "Parent/Guardian", { quotes: "double", wrap: true }],
  [
    "Multilingual literal",
    "Ångström — 比赛 · π ≤ ½ 🙂",
    { quotes: "double", wrap: true },
  ],
  [
    "Long mixed literal",
    "const message = 'Résultats – 成績';\n".repeat(64),
    { quotes: "double", wrap: true },
  ],
  ["Hexadecimal number", 4095, { numbers: "hexadecimal" }],
].map(([name, value, options]) => ({
  name,
  make(file) {
    const j = require(file);
    return () => j(value, options);
  },
  validate(result) {
    assert.equal(result, require(upstream)(value, options));
  },
}));
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm: root,
    cases,
    files: ["index.cjs", "bench/compare.cjs", path.relative(root, upstream)],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
