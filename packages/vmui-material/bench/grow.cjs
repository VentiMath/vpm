"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const conformance = "../../../scripts/mui-material-conformance";
const { fixture, peer } = require(conformance + "/paths.cjs");
const base = fixture + "/node_modules/.vpm-material";
const files = [
  "grow-transition.cjs",
  "Grow.mjs",
  "PROVENANCE.json",
  "../vreact-transition-group/index.cjs",
  "../../scripts/mui-material-conformance/grow-scene.jsx",
  "bench/grow.cjs",
  "../../scripts/mui-material-conformance/grow-ssr-entry.jsx",
  "../../scripts/mui-material-conformance/subpath-build.cjs",
  "../../scripts/mui-material-conformance/grow-build.cjs",
  "../../scripts/mui-system-conformance/package-lock.json",
];
const cases = [];
for (const version of ["app", "current"]) {
  const bundle = (lib) => base + "/" + version + "-" + lib + "/grow-ssr.cjs";
  for (const lib of ["upstream", "vpm"])
    files.push(path.relative(root, bundle(lib)));
  const browserBundle = (lib) =>
    path.join(base, version + "-" + lib, "grow-browser.js");
  for (const lib of ["upstream", "vpm"])
    files.push(path.relative(root, browserBundle(lib)));
  cases.push({
    name:
      (version === "app" ? "App7" : "Material9") +
      " mounted open/close (jsdom)",
    async make(file) {
      const { JSDOM } = peer("jsdom");
      const { window } = new JSDOM("<body></body>", {
        runScripts: "outside-only",
        pretendToBeVisual: true,
      });
      window.eval(
        require("node:fs").readFileSync(
          browserBundle(file === root ? "vpm" : "upstream"),
          "utf8",
        ),
      );
      window.draw(false);
      await new Promise((done) => setTimeout(done, 10));
      return () => window.cycle();
    },
    validate: (value) =>
      assert.equal(value, "Enter,Entering,Entered,Exit,Exiting,Exited"),
  });
  for (const kind of ["closed", "open"]) {
    const expected = require(bundle("upstream")).prepare(kind)();
    assert.ok(expected.length);
    cases.push({
      name: (version === "app" ? "App7" : "Material9") + " " + kind + " SSR",
      make: (file) =>
        require(bundle(file === root ? "vpm" : "upstream")).prepare(kind),
      validate: (html) => assert.equal(html, expected),
    });
  }
}
require("../../../scripts/bench-process.cjs")
  .run({ root, upstream: "upstream", vpm: root, cases, files })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
