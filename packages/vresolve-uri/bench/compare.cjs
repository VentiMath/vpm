"use strict";
const path = require("node:path"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const fixture = require("node:module").createRequire(require.resolve("../../../scripts/source-map-conformance/package.json"));
const upstream = fixture.resolve("@jridgewell/resolve-uri");
const url = "https://[::1]:5173/assets/vendor/index.js.map";
const cases = [
  ["relative map", ["../src/app.ts", "./src/data.ts", "index.ts", "../../x.ts"], "dist/app.js.map"],
  ["absolute map", ["../src/app.ts", "foo/../lib.ts", "index.ts?q#L1", "/root/a.ts"], url],
  ["virtual and file sources", ["webpack:///./src/a.ts", "file:///src/sub/../b.ts", "//cdn.test/lib.ts", "#section"], url],
].map(([name, refs, base]) => {
  const expected = refs.map(ref => require(upstream)(ref, base));
  return {name, make(file) {
    const resolve = require(file);
    return () => refs.map(ref => resolve(ref, base));
  }, validate: actual => assert.deepEqual(actual, expected)};
});
require("../../../scripts/bench-process.cjs").run({root, upstream, vpm:root, cases,
  files:["index.cjs","package.json","PROVENANCE.json","bench/compare.cjs",path.relative(root,upstream),"../../scripts/source-map-conformance/package-lock.json"]
}).catch(error => {console.error(error);process.exitCode=1});
