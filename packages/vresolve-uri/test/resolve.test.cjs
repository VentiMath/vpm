"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const resolve = require("..");
const fixture = require("node:module").createRequire(require.resolve("../../../scripts/source-map-conformance/package.json"));
const upstream = fixture("@jridgewell/resolve-uri");

test("source references preserve source spelling and suffixes", () => {
  assert.equal(resolve("../src/a.ts?q=../b#L3", "https://[::1]:5173/assets/index.js.map"), "https://[::1]:5173/src/a.ts?q=../b#L3");
  assert.equal(resolve("file:C:/project/../src/a.ts"), "file:///C:/src/a.ts");
  assert.equal(resolve("#line", "../a.ts?query#old"), "../a.ts?query#line");
  assert.equal(resolve("../../a.ts", "webpack:///src/"), "webpack:///a.ts");
  assert.equal(resolve("../%2e%2e/x", "https://EXAMPLE:443/src/"), "https://EXAMPLE:443/%2e%2e/x");
});

test("relative, rooted, file and network source maps agree with 3.1.3", () => {
  const paths = ["", ".", "./", "..", "../", "../../..", "x", "./x", ".hidden", "src/../", "one/two/..", "one/two/../.", "../lib//test", "out/a.js.map", "%2e%2e/a", "/src/file", "///x", "//[::1]:8443/js", "https://User@HOST:80/dir", "webpack:///src/./index", "file:../x", "file://C:/dir", "file://host/share", "file:///a"];
  const refs = paths.flatMap(p => ["", "?q=../", "#L4", "?a#fragment"].map(s => p + s));
  for (const base of refs) for (const ref of refs) {
    assert.equal(resolve(ref, base), upstream(ref, base), JSON.stringify({ref,base}));
  }
});
