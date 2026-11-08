"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/match-sorter-conformance"),
  from = require("node:module").createRequire(
    path.join(fixture, "package.json"),
  );
const scenarios = [
  ["ASCII exact", () => ["Geometry", "Geometry"]],
  ["ASCII table filter", () => ["Intermediate Algebra Practice", "iap"]],
  [
    "Loose subsequence",
    () => ["International Mathematics Invitational", "intermath"],
  ],
  ["Accented name", () => ["Renée Élise González", "renee"]],
  [
    "Row with multiple accessors",
    () => [
      { name: "Renée González", subjects: ["Algebra", "Geometry"] },
      "geo",
      { accessors: [(x) => x.name, (x) => x.subjects] },
    ],
  ],
];
const cases = scenarios.map(([name, make]) => ({
  name,
  make(file) {
    const api = require(file),
      args = make();
    return () => api.rankItem(...args);
  },
  validate(value) {
    assert.equal(value.passed, true);
    assert.ok(value.rank >= 1);
  },
}));
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: from.resolve("@tanstack/match-sorter-utils"),
    vpm: root,
    cases,
    files: [
      "index.cjs",
      "index.mjs",
      "index.d.cts",
      "index.d.mts",
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../../scripts/match-sorter-conformance/package-lock.json",
      "../../scripts/match-sorter-conformance/node_modules/@tanstack/match-sorter-utils/dist/index.js",
      "../../scripts/match-sorter-conformance/node_modules/@tanstack/match-sorter-utils/dist/remove-accents.js",
    ],
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
