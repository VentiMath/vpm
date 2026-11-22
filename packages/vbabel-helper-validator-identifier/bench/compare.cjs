"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path");
const root = path.resolve(__dirname, ".."),
  fixture = require("node:module").createRequire(
    require.resolve("../../../scripts/source-map-conformance/package.json"),
  );
const upstream = fixture.resolve("identifier-app"),
  control = require(upstream);
const workloads = [
  [
    "ASCII names",
    "isIdentifierName",
    [
      "courseSteps",
      "_next",
      "$value",
      "v2",
      "WARML_STEP_ABOUT_YOU",
      "0first",
      "x-y",
      "current",
    ],
  ],
  [
    "Unicode names",
    "isIdentifierName",
    ["π", "學生", "e\u0301", "𐐀rank", "α9", "a\u200d", "🙂", "\ud800"],
  ],
  [
    "Mixed code points",
    "isIdentifierChar",
    [65, 0x3c0, 0x4e00, 0x200c, 0x301, 0x10400, 0x1f642, 0xd800],
  ],
  [
    "Strict module bindings",
    "isStrictBindReservedWord",
    ["await", "arguments", "eval", "yield", "number", "course", "enum", "sum"],
  ],
];
const cases = workloads.map(([name, method, inputs]) => ({
  name,
  make(file) {
    const fn = require(file)[method];
    return () => {
      let mask = 0;
      for (const input of inputs) mask = mask * 2 + Number(fn(input, true));
      return mask;
    };
  },
  validate(mask) {
    assert.equal(
      mask,
      inputs.reduce((a, x) => a * 2 + Number(control[method](x, true)), 0),
    );
  },
}));
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm: root,
    cases,
    files: [
      "index.cjs",
      "unicode.cjs",
      "bench/compare.cjs",
      path.relative(root, path.dirname(upstream)),
    ],
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
