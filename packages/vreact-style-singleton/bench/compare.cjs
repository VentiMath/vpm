"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(
    root,
    "../../scripts/sidecar-conformance/node_modules",
  );
// Fixture peers are pinned; do not change the root workspace's React version.
const fs = require("node:fs"),
  modules = path.join(root, "node_modules");
fs.mkdirSync(modules, { recursive: true });
for (const [name, target] of [
  ["react", path.join(fixture, "react")],
  ["vget-nonce", path.resolve(root, "../vget-nonce")],
]) {
  if (!fs.existsSync(path.join(modules, name)))
    fs.symlinkSync(target, path.join(modules, name), "dir");
}
const windows = [];
function setup(file) {
  const { JSDOM } = require(path.join(fixture, "jsdom"));
  const window = new JSDOM("<!doctype html><head></head>").window;
  windows.push(window);
  globalThis.document = window.document;
  return require(file);
}
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    cleanup: () => {for (const window of windows) window.close();},
    upstream: path.join(fixture, "react-style-singleton"),
    vpm: root,
    files: [
      "package.json",
      "index.cjs",
      "index.mjs",
      "../vget-nonce/index.cjs",
      "bench/compare.cjs",
      "../../scripts/sidecar-conformance/package-lock.json",
      "../../scripts/sidecar-conformance/node_modules/react-style-singleton",
    ],
    cases: [
      {
        name: "stylesheet factory",
        make: (file) => {
          const api = setup(file);
          return () => api.stylesheetSingleton();
        },
        validate: (x) => assert.equal(typeof x.add, "function"),
      },
      {
        name: "active reference add/remove",
        make: (file) => {
          const sheet = setup(file).stylesheetSingleton();
          sheet.add("body{overflow:hidden}");
          return () => {
            sheet.add("ignored");
            sheet.remove();
            return document.head.childElementCount;
          };
        },
        validate: (x) => assert.equal(x, 1),
      },
      {
        name: "DOM insert/remove (jsdom)",
        make: (file) => {
          const sheet = setup(file).stylesheetSingleton();
          return () => {
            sheet.add("body{overflow:hidden}");
            sheet.remove();
            return document.head.childElementCount;
          };
        },
        validate: (x) => assert.equal(x, 0),
      },
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
