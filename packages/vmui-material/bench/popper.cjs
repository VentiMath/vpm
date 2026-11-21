"use strict";
process.env.NODE_ENV = "production";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const {
  fixture,
  peer,
} = require("../../../scripts/mui-material-conformance/paths.cjs");
const root = path.resolve(__dirname, "..");
const base = fixture + "/node_modules/.vpm-material/app-";
const files = [
  "search-popper.cjs",
  "bench/popper.cjs",
  "../../scripts/mui-material-conformance/popper-browser-entry.jsx",
  "../../scripts/mui-material-conformance/popper-ssr-entry.jsx",
  "../../scripts/mui-system-conformance/package-lock.json",
];
const bundle = (lib, browser) =>
  base + lib + (browser ? "/popper-browser.js" : "/popper-ssr.cjs");
for (const lib of ["upstream", "vpm"])
  for (const browser of [false, true])
    files.push(path.relative(root, bundle(lib, browser)));
const cases = [
  {
    name: "Mounted results to empty and back",
    async: true,
    async make(file) {
      const { JSDOM } = peer("jsdom");
      const { window } = new JSDOM("<body></body>", {
        runScripts: "outside-only",
        pretendToBeVisual: true,
      });
      window.eval(fs.readFileSync(bundle(file, true), "utf8"));
      window.draw("result");
      await new Promise((r) => setTimeout(r, 50));
      const panel = window.document.querySelector(".MuiPopper-root");
      return async () => {
        window.draw("empty");
        await new Promise(done => setImmediate(done));
        window.draw("result");
        await new Promise(done => setImmediate(done));
        return panel.isConnected && panel.textContent;
      };
    },
    validate: (value) => assert.equal(value, "USAMTS"),
  },
];
for (const open of [false, true]) {
  cases.push({
    name: open ? "Open portal SSR" : "Closed portal SSR",
    make(file) {
      const api = require(bundle(file, false));
      return () => api.render({ open });
    },
    validate: (value) => assert.equal(value, ""),
  });
}
require("../../../scripts/bench-process.cjs")
  .run({ root, upstream: "upstream", vpm: "vpm", cases, files })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
