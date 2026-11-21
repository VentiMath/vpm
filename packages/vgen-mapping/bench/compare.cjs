"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const fixture = require("node:module").createRequire(
  require.resolve("../../../scripts/source-map-conformance/package.json"),
);
const upstream = fixture.resolve("@jridgewell/gen-mapping"),
  control = require(upstream);
const mapFile = path.join(
  path.dirname(fixture.resolve("@babel/generator")),
  "printer.js.map",
);
const input = JSON.parse(fs.readFileSync(mapFile));
const entries = control.allMappings(control.fromMap(input));
function writer(api, items, encode) {
  return () => {
    const map = new api.GenMapping({ file: input.file });
    for (const item of items) api.maybeAddMapping(map, item);
    return encode ? api.toEncodedMap(map) : api.toDecodedMap(map);
  };
}
const cases = [
  ...[
    ["small generated map", entries.slice(0, 40), true],
    ["Babel printer decoded map", entries, false],
    ["Babel printer encoded map", entries, true],
  ].map(([name, items, encode]) => {
    const expected = writer(control, items, encode)();
    return {
      name,
      make: (file) => writer(require(file), items, encode),
      validate: (value) => assert.deepEqual(value, expected),
    };
  }),
  {
    name: "import printer map and enumerate",
    make(file) {
      const api = require(file);
      return () => api.allMappings(api.fromMap(input));
    },
    validate: (value) => assert.deepEqual(value, entries),
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
      "../vtrace-mapping/index.cjs",
      "../vsourcemap-codec/index.cjs",
      "../vresolve-uri/index.cjs",
      path.relative(root, upstream),
      path.relative(root, mapFile),
      "../../scripts/source-map-conformance/package-lock.json",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
