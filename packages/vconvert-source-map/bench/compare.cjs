"use strict";
const path = require("node:path"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = require("node:module").createRequire(
    require.resolve("../../../scripts/source-map-conformance/package.json"),
  );
const upstream = fixture.resolve("convert-source-map");
const mapFile = path.join(
  path.dirname(fixture.resolve("@babel/generator")),
  "printer.js.map",
);
const full = JSON.parse(fs.readFileSync(mapFile)),
  small = {
    version: 3,
    names: [],
    sources: ["input.ts"],
    mappings: "AAAA",
    sourcesContent: ["const π=2;"],
  };
const cases = [];
for (const [label, map] of [
  ["small", small],
  ["printer", full],
]) {
  const comment = require(upstream).fromObject(map).toComment();
  cases.push(
    {
      name: label + " Babel write",
      make: (file) => {
        const api = require(file);
        return () => api.fromObject(map).toComment();
      },
      validate: (x) => assert.equal(x, comment),
    },
    {
      name: label + " Babel read",
      make: (file) => {
        const api = require(file);
        return () => api.fromComment(comment).sourcemap;
      },
      validate: (x) => assert.deepEqual(x, map),
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
      "bench/compare.cjs",
      "package.json",
      path.relative(root, mapFile),
      path.relative(root, upstream),
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
