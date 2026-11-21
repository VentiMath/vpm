"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const conformance = "../../../scripts/mui-material-conformance";
const { fixture, peer } = require(conformance + "/paths.cjs");
const base = fixture + "/node_modules/.vpm-material";
const files = [
  "click-away.cjs",
  "ClickAwayListener.mjs",
  "PROVENANCE.json",
  "bench/click-away.cjs",
  "../../scripts/mui-material-conformance/click-away-ssr-entry.jsx",
  "../../scripts/mui-material-conformance/subpath-build.cjs",
  "../../scripts/mui-material-conformance/click-away-build.cjs",
  "../../scripts/mui-system-conformance/package-lock.json",
];
const cases = [];
for (const version of ["app", "current"]) {
  const bundle = (lib) =>
    base + "/" + version + "-" + lib + "/click-away-ssr.cjs";
  for (const lib of ["upstream", "vpm"])
    files.push(path.relative(root, bundle(lib)));
  const browserBundle = (lib) =>
    path.join(base, version + "-" + lib, "click-away-browser.js");
  for (const lib of ["upstream", "vpm"])
    files.push(path.relative(root, browserBundle(lib)));
  cases.push({
    name:
      (version === "app" ? "App7" : "Material9") +
      " mounted event sequence (jsdom)",
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
      window.draw();
      await new Promise((done) => setTimeout(done, 10));
      window.take();
      return () => {
        window.fire("toggle");
        window.fire("suggestion");
        window.fire("outside");
        return window.take().join(",");
      };
    },
    validate: (value) => assert.equal(value, "child,child,close:click"),
  });
  for (const kind of ["search", "sidebar"]) {
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
