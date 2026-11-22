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
      web ? "list-item-browser.js" : "list-item-ssr.cjs",
    );
const files = [
  "lists.cjs",
  "theme.cjs",
  "bench/list-item.cjs",
  "../../scripts/mui-material-conformance/list-item-scene.jsx",
  "../../scripts/mui-material-conformance/list-item-browser-entry.jsx",
  "../../scripts/mui-material-conformance/list-item-ssr-entry.jsx",
  "../../scripts/mui-system-conformance/package-lock.json",
];
for (const lib of ["upstream", "vpm"])
  for (const web of [false, true])
    files.push(path.relative(root, bundle(lib, web)));
const cases = [false, true].map((settings) => ({
  name: settings
    ? "Settings rows with switches SSR"
    : "Event and note rows SSR",
  make(lib) {
    const api = require(bundle(lib, false));
    return () => api.render({ rows: !settings, settings });
  },
  validate(markup) {
    assert.equal((markup.match(/<li /g) || []).length, settings ? 3 : 4);
    assert.ok(markup.includes(settings ? "Notifications" : "Team practice"));
  },
}));
cases.push({
  name: "Mounted event and note reorder",
  async: true,
  make(lib) {
    const { JSDOM } = peer("jsdom"),
      { window } = new JSDOM("<body/>", {
        runScripts: "outside-only",
        pretendToBeVisual: true,
      });
    window.eval(fs.readFileSync(bundle(lib, true), "utf8"));
    window.draw({ settings: false });
    const first = window.document.querySelector("[data-title]");
    return async () => {
      window.draw({ settings: false, reverse: true, detail: "Tuesday" });
      window.draw({ settings: false });
      await new Promise((done) => setImmediate(done));
      return (
        first === window.document.querySelector("[data-title]") &&
        first.textContent.endsWith("Monday")
      );
    };
  },
  validate: (result) => assert.equal(result, true),
});
require("../../../scripts/bench-process.cjs")
  .run({ root, upstream: "upstream", vpm: "vpm", files, cases })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
