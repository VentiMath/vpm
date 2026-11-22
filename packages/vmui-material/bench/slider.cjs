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
    browser ? "slider-browser.js" : "slider-ssr.cjs",
  );
const files = [
  "font-slider.cjs",
  "bench/slider.cjs",
  "../../scripts/mui-material-conformance/slider-browser-entry.jsx",
  "../../scripts/mui-material-conformance/slider-ssr-entry.jsx",
  "../../scripts/mui-material-conformance/slider-scene.jsx",
  "../../scripts/mui-system-conformance/package-lock.json",
];
for (const lib of ["upstream", "vpm"])
  for (const browser of [true, false])
    files.push(path.relative(root, bundle(lib, browser)));
const cases = [
  {
    name: "Seven-mark toolbar SSR",
    make(lib) {
      const { render } = require(bundle(lib, false));
      return () => render({ value: 16, size: "small", color: "secondary" });
    },
    validate(html) {
      assert.match(html, /type="range"/);
      assert.match(html, /70%<\/span>/);
      assert.match(html, /130%<\/span>/);
    },
  },
  {
    name: "Mounted 100% to 110% and back",
    async: true,
    make(lib) {
      const { JSDOM } = peer("jsdom");
      const { window } = new JSDOM("<body></body>", {
        runScripts: "outside-only",
        pretendToBeVisual: true,
      });
      window.eval(fs.readFileSync(bundle(lib, true), "utf8"));
      window.draw();
      window.document.querySelector("input").focus();
      return async () => {
        const result = window.keyboardCycle();
        await new Promise((resolve) => setImmediate(resolve));
        return result;
      };
    },
    validate(result) {
      assert.equal(result, "change=17.6,commit=17.6,change=16,commit=16");
    },
  },
];
require("../../../scripts/bench-process.cjs")
  .run({ root, upstream: "upstream", vpm: "vpm", cases, files })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
