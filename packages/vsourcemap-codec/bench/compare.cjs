"use strict";
const path = require("node:path"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const fixture = require("node:module").createRequire(
  require.resolve("../../../scripts/source-map-conformance/package.json"),
);
const upstream = fixture.resolve("codec-app");
const wire = JSON.parse(
  fs.readFileSync(
    path.join(
      path.dirname(fixture.resolve("@jridgewell/trace-mapping")),
      "trace-mapping.mjs.map",
    ),
  ),
).mappings;
const cases = [];
for (const [label, encoded] of [
  ["short", "AAAA,QAEC;AACD"],
  ["trace-mapping build", wire],
]) {
  const decoded = require(upstream).decode(encoded);
  cases.push(
    {
      name: label + " encode",
      make: (file) => {
        const { encode } = require(file);
        return () => encode(decoded);
      },
      validate: (value) => assert.equal(value, encoded),
    },
    {
      name: label + " decode",
      make: (file) => {
        const { decode } = require(file);
        return () => decode(encoded);
      },
      validate: (value) => assert.deepEqual(value, decoded),
    },
  );
}
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
      "../../scripts/source-map-conformance/package-lock.json",
      "../../scripts/source-map-conformance/node_modules/@jridgewell/trace-mapping/dist/trace-mapping.mjs.map",
    ],
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
