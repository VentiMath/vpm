"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const conformance = "../../../scripts/mui-material-conformance";
const { fixture } = require(conformance + "/paths.cjs");
const base = fixture + "/node_modules/.vpm-material";
const files = [
  "theme.cjs",
  "GlobalStyles.mjs",
  "PROVENANCE.json",
  "bench/globals.cjs",
  "../../scripts/mui-material-conformance/globals-ssr-entry.jsx",
  "../../scripts/mui-material-conformance/globals-scene.jsx",
  "../../scripts/mui-material-conformance/globals-build.cjs",
  "../../scripts/mui-system-conformance/package-lock.json",
];
const cases = [];
for (const version of ["app", "current"]) {
  const bundle = (lib) => base + "/" + version + "-" + lib + "/globals-ssr.cjs";
  for (const lib of ["upstream", "vpm"])
    files.push(path.relative(root, bundle(lib)));
  for (const kind of ["navigation", "page", "frameSheets"]) {
    const html = require(bundle("upstream")).prepare(kind)();
    const expected = html.match(/<style[^>]*>([\s\S]*?)<\/style>/)[1];
    assert.ok(expected.length);
    cases.push({
      name: (version === "app" ? "App7" : "Material9") + " " + kind + " SSR",
      make: (file) =>
        require(bundle(file === root ? "vpm" : "upstream")).prepare(kind),
      validate: (html) => assert.ok(html.includes(">" + expected + "</style>")),
    });
  }
}
require("../../../scripts/bench-process.cjs")
  .run({ root, upstream: "upstream", vpm: root, cases, files })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
