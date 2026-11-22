"use strict";
process.env.NODE_ENV = "production";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
const {
  fixture,
  peer,
} = require("../../../scripts/mui-material-conformance/paths.cjs");
const bundle = (lib, web = false) =>
  path.join(
    fixture,
    "node_modules/.vpm-material/app-" + lib,
    web ? "css-baseline-browser.js" : "css-baseline-ssr.cjs",
  );
const files = [
  "CssBaseline.cjs",
  "theme.cjs",
  "bench/css-baseline.cjs",
  "../../scripts/mui-material-conformance/css-baseline-scene.jsx",
  "../../scripts/mui-material-conformance/css-baseline-browser-entry.jsx",
  "../../scripts/mui-material-conformance/css-baseline-ssr-entry.jsx",
  "../../scripts/mui-system-conformance/package-lock.json",
];
for (const lib of ["upstream", "vpm"])
  for (const web of [false, true])
    files.push(path.relative(root, bundle(lib, web)));
const cases = [
  ["Default document SSR", {}, "box-sizing:border-box"],
  ["Dark theme overrides SSR", { mode: "dark", override: true }, "#192432"],
  [
    "CSS-variable schemes SSR",
    { mode: "light", selector: "class", scheme: true },
    ".dark{",
  ],
].map(([name, props, rule]) => ({
  name,
  make(lib) {
    return require(bundle(lib)).prepare(props);
  },
  validate(html) {
    assert.ok(html.includes(rule) && html.includes("Practice"));
  },
}));
cases.push({
  name: "Mounted LTR and RTL theme swap",
  async: true,
  make(lib) {
    const { JSDOM } = peer("jsdom"),
      { window } = new JSDOM("<body/>", {
        runScripts: "outside-only",
        pretendToBeVisual: true,
      });
    window.eval(fs.readFileSync(bundle(lib, true), "utf8"));
    window.draw("light", "ltr");
    const child = window.document.querySelector("strong");
    return async () => {
      window.draw("dark", "rtl");
      window.draw("light", "ltr");
      await new Promise((done) => setImmediate(done));
      return (
        child.isConnected &&
        window.document.querySelectorAll('style[data-emotion^="muiltr"]')
          .length > 0
      );
    };
  },
  validate: (value) => assert.equal(value, true),
});
require("../../../scripts/bench-process.cjs")
  .run({ root, upstream: "upstream", vpm: "vpm", files, cases })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
