"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const fixture = require("node:module").createRequire(
  require.resolve("../../../scripts/source-map-conformance/package.json"),
);
const upstream = fixture.resolve("@jridgewell/trace-mapping");
const mapFile = path.join(
  path.dirname(fixture.resolve("@babel/generator")),
  "printer.js.map",
);
const input = JSON.parse(fs.readFileSync(mapFile));
const url = "/assets/lib/printer.js.map";
const control = require(upstream),
  reference = new control.TraceMap(input, url);
const rows = control.decodedMappings(reference);
const needles = [];
for (let i = 0; i < rows.length; i += 5) {
  const row = rows[i];
  if (row.length)
    needles.push({ line: i + 1, column: row[row.length >> 1][0] });
}
const repeat = needles[Math.floor(needles.length / 2)];
const expected = control.originalPositionFor(reference, repeat);
const page = needles.slice(0, 64);
const cases = [
  {
    name: "construct and first lookup",
    make(file) {
      const api = require(file);
      return () =>
        api.originalPositionFor(new api.TraceMap(input, url), repeat);
    },
    validate: (v) => assert.deepEqual(v, expected),
  },
  {
    name: "warm repeated lookup",
    make(file) {
      const api = require(file),
        map = new api.TraceMap(input, url);
      api.decodedMappings(map);
      return () => api.originalPositionFor(map, repeat);
    },
    validate: (v) => assert.deepEqual(v, expected),
  },
  {
    name: "64 warm forward lookups",
    make(file) {
      const api = require(file),
        map = new api.TraceMap(input, url);
      api.decodedMappings(map);
      return () => page.map((q) => api.originalPositionFor(map, q));
    },
    validate: (v) =>
      assert.deepEqual(
        v,
        page.map((q) => control.originalPositionFor(reference, q)),
      ),
  },
  {
    name: "gen-mapping decoded import",
    make(file) {
      const api = require(file);
      return () => api.decodedMappings(new api.TraceMap(input, url));
    },
    validate: (v) => assert.deepEqual(v, rows),
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
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../vresolve-uri/index.cjs",
      "../vsourcemap-codec/index.cjs",
      path.relative(root, upstream),
      path.relative(root, mapFile),
      "../../scripts/source-map-conformance/package-lock.json",
    ],
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
