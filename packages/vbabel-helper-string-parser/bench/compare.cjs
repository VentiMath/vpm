"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
const upstream = require("node:module")
  .createRequire(
    require.resolve("../../../scripts/source-map-conformance/package.json"),
  )
  .resolve("string-parser-app");
const errors = { unterminated() {} };
const workloads = [
  ["Short template elements", ["course", "item: ", "", " practice"]],
  [
    "Long plain template",
    ["background-color: var(--calendar-line); ".repeat(20)],
  ],
  [
    "Escapes and line continuations",
    ["button\\nlabel", "\\u{1F600}", "x\\x3d1", "first\\\r\nsecond\r\nthird"],
  ],
  [
    "Invalid tagged escapes",
    ["rank\\8", "label\\xQ", "id\\u12xz", "size\\400"],
  ],
];
function workload(file, inputs) {
  const { readStringContents } = require(file);
  return () => {
    let sum = 0;
    for (const input of inputs) {
      const result = readStringContents("template", input, 0, 0, 1, errors);
      sum +=
        result.str.length + result.curLine + (result.containsInvalid ? 256 : 0);
    }
    return sum;
  };
}
const cases = workloads.map(([name, inputs]) => ({
  name,
  make: (file) => workload(file, inputs),
  validate: (sum) => assert.equal(sum, workload(upstream, inputs)()),
}));
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm: root,
    files: [
      "index.cjs",
      "bench/compare.cjs",
      path.relative(root, path.dirname(upstream)),
    ],
    cases,
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
