"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
const {
  fixture,
  peer,
} = require("../../../scripts/mui-material-conformance/paths.cjs");
const root = path.resolve(__dirname, ".."),
  bundle = (lib, web) =>
    path.join(
      fixture,
      "node_modules/.vpm-material/app-" + lib,
      web ? "step-content-browser.js" : "step-content-ssr.cjs",
    );
const files = [
  "course-step-content.cjs",
  "collapses.cjs",
  "registration-steps.cjs",
  "step-position.cjs",
  "bench/step-content.cjs",
  "../../scripts/mui-material-conformance/step-content-scene.jsx",
  "../../scripts/mui-material-conformance/step-content-browser-entry.jsx",
  "../../scripts/mui-material-conformance/step-content-ssr-entry.jsx",
  "../../scripts/mui-system-conformance/package-lock.json",
];
for (const lib of ["upstream", "vpm"])
  for (const web of [false, true])
    files.push(path.relative(root, bundle(lib, web)));
const cases = [true, false].map((expanded) => ({
  name: expanded ? "All six Academy subtitles SSR" : "One active subtitle SSR",
  make(lib) {
    const api = require(bundle(lib, false));
    return () => api.render({ activeStep: 1, expanded });
  },
  validate(markup) {
    assert.equal(
      (markup.match(/Subtitle for /g) || []).length,
      expanded ? 6 : 1,
    );
    assert.ok(markup.includes("Subtitle for Introduction"));
  },
}));
cases.push({
  name: "Mounted navigation with six expanded subtitles",
  async: true,
  make(lib) {
    const { JSDOM } = peer("jsdom"),
      { window } = new JSDOM("<body/>", {
        runScripts: "outside-only",
        pretendToBeVisual: true,
      });
    window.eval(fs.readFileSync(bundle(lib, true), "utf8"));
    window.draw();
    const inner = window.document.querySelector(
      ".MuiStepContent-root .MuiCollapse-wrapperInner",
    );
    return async () => {
      window.draw({ activeStep: 2 });
      window.draw({ activeStep: 1 });
      await new Promise((done) => setImmediate(done));
      return inner.isConnected && inner.textContent;
    };
  },
  validate: (result) => assert.equal(result, "Subtitle for Introduction"),
});
require("../../../scripts/bench-process.cjs")
  .run({ root, upstream: "upstream", vpm: "vpm", files, cases })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
