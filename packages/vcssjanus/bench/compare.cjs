"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/cssjanus-conformance"),
  upstream = path.join(fixture, "node_modules/cssjanus");
const inputs = [
  [
    "short directional declaration",
    ".x{margin-left:12px;padding:1px 2px 3px 4px}",
  ],
  [
    "unchanged rule",
    ".x{display:flex;color:red;align-items:center;font-size:14px}",
  ],
  [
    "theme component",
    require(path.join(fixture, "cases.cjs")).slice(0, 7).join(""),
  ],
  [
    "large stylesheet",
    Array.from(
      { length: 30 },
      (_, i) =>
        ".c" +
        i +
        "{margin-left:12px;padding:1px 2px 3px 4px;border-radius:1px 2px 3px 4px;background:url(a) 20% 40%;box-shadow:-2px 3px 4px red}",
    ).join(""),
  ],
];
inputs.push([
  "varied stylesheet",
  Array.from(
    { length: 30 },
    (_, i) =>
      `.c${i}{margin-left:${i}px;padding:1px ${i + 2}px 3px ${i + 4}px;border-radius:1px ${i + 2}px 3px ${i + 4}px;background:url(a) ${i + 20}% 40%;box-shadow:-${i + 2}px 3px 4px red}`,
  ).join(""),
]);
const cases = inputs.map(([name, css]) => ({
  name,
  make(file) {
    const t = require(file).transform;
    return () => t(css);
  },
  validate(s) {
    assert.equal(s, require(upstream).transform(css));
  },
}));
cases.push({
  name: "unchanged RTL wrapper + app layer",
  make(file) {
    const call = require(path.join(fixture, "load.cjs"))(file);
    return () => call(inputs[2][1]);
  },
  validate(s) {
    assert.equal(
      s,
      require(path.join(fixture, "load.cjs"))(upstream)(inputs[2][1]),
    );
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
      "../../scripts/cssjanus-conformance/load.cjs",
      "../../scripts/cssjanus-conformance/cases.cjs",
      "../../scripts/cssjanus-conformance/package-lock.json",
      "../../scripts/cssjanus-conformance/node_modules/cssjanus",
      "../../scripts/cssjanus-conformance/node_modules/stylis-plugin-rtl",
      "../../scripts/cssjanus-conformance/node_modules/stylis",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
