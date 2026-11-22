"use strict";
process.env.NODE_ENV = "production";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const {
  fixture,
  peer,
} = require("../../../scripts/mui-material-conformance/paths.cjs");
const root = path.resolve(__dirname, "..");
const bundle = (lib, browser) =>
  path.join(
    fixture,
    "node_modules/.vpm-material/app-" + lib,
    browser ? "steps-browser.js" : "steps-ssr.cjs",
  );
const files = [
  "registration-steps.cjs",
  "bench/steps.cjs",
  "../../scripts/mui-material-conformance/steps-browser-entry.jsx",
  "../../scripts/mui-material-conformance/steps-ssr-entry.jsx",
  "../../scripts/mui-material-conformance/steps-scene.jsx",
  "../../scripts/mui-system-conformance/package-lock.json",
];
for (const lib of ["upstream", "vpm"])
  for (const browser of [false, true])
    files.push(path.relative(root, bundle(lib, browser)));
const cases = ["student", "volunteer"].map((role) => ({
  name: role + " registration SSR",
  make(lib) {
    const { render } = require(bundle(lib, false));
    return () => render({ role, activeStep: 1 });
  },
  validate(html) {
    assert.ok(html.includes("Confirm"));
    assert.equal(
      (html.match(/class="MuiStep-root /g) || []).length,
      role === "student" ? 6 : 3,
    );
  },
}));
cases.push({
  name: "Mounted next and back, six steps",
  async: true,
  make(lib) {
    const { JSDOM } = peer("jsdom");
    const { window } = new JSDOM("<body></body>", {
      runScripts: "outside-only",
      pretendToBeVisual: true,
    });
    window.eval(fs.readFileSync(bundle(lib, true), "utf8"));
    window.draw();
    const first = window.document.querySelector(".MuiStepLabel-label");
    return async () => {
      window.draw("student", 1);
      window.draw("student", 0);
      await new Promise((r) => setImmediate(r));
      return first.isConnected && first.classList.contains("Mui-active");
    };
  },
  validate: (v) => assert.equal(v, true),
});
require("../../../scripts/bench-process.cjs")
  .run({ root, upstream: "upstream", vpm: "vpm", cases, files })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
