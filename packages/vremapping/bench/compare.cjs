"use strict";
const path = require("node:path"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const fixture = require("node:module").createRequire(
  require.resolve("../../../scripts/source-map-conformance/package.json"),
);
const upstream = fixture.resolve("@jridgewell/remapping");
const mapFile = path.join(
  path.dirname(fixture.resolve("@babel/generator")),
  "printer.js.map",
);
const printer = JSON.parse(fs.readFileSync(mapFile));
const lines = fixture("@jridgewell/trace-mapping").decodedMappings(
  new (fixture("@jridgewell/trace-mapping").TraceMap)(printer),
);
const compact = { ...printer, mappings: lines.slice(0, 24) };
const identity = {
  version: 3,
  sources: ["printer.js"],
  names: [],
  mappings: lines.map((row, i) => row.map((s) => [s[0], 0, i, s[0]])),
};
const cases = [
  ["Small single map", compact, () => null, {}],
  ["Babel printer map", printer, () => null, {}],
  ["Loaded printer transform", identity, () => null, {}],
].map(([name, input, loader, opts], i) => {
  if (i === 2) loader = (source, ctx) => (ctx.depth === 1 ? printer : null);
  const expected = require(upstream)(input, loader, opts).toString();
  return {
    name,
    validate: (m) => assert.equal(m.toString(), expected),
    make(file) {
      const compose = require(file);
      return () => compose(input, loader, opts);
    },
  };
});
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm: root,
    cases,
    files: [
      "index.cjs",
      "package.json",
      "bench/compare.cjs",
      "../vgen-mapping/index.cjs",
      "../vtrace-mapping/index.cjs",
      path.relative(root, upstream),
      path.relative(root, mapFile),
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
