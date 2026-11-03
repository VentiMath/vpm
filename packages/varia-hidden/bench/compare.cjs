"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  { createRequire } = require("node:module");
const root = path.resolve(__dirname, ".."),
  from = createRequire(
    path.resolve(root, "../../scripts/aria-conformance/package.json"),
  ),
  windows = [];
const cases = [];
for (const [name, depth, siblings, overlap] of [
  ["flat / 40 siblings", 1, 40, false],
  ["nested / 12 levels", 12, 4, false],
  ["overlapping / 40 siblings", 1, 40, true],
])
  cases.push({
    name,
    make: (file) => {
      const api = require(file),
        dom = new (from("jsdom").JSDOM)("<body></body>"),
        d = dom.window.document;
      windows.push(dom.window);
      globalThis.document = d;
      let parent = d.body;
      for (let level = 0; level < depth; level++) {
        for (let i = 0; i < siblings; i++)
          parent.append(d.createElement("aside"));
        const branch = d.createElement("section");
        parent.append(branch);
        parent = branch;
      }
      const sample = d.querySelector("aside");
      return () => {
        const a = api.hideOthers(parent, d.body),
          b = overlap ? api.hideOthers(parent, d.body) : null;
        const hidden = sample.getAttribute("aria-hidden");
        a();
        if (b) b();
        return (
          hidden === "true" &&
          !sample.hasAttribute("aria-hidden") &&
          !sample.hasAttribute("data-aria-hidden")
        );
      };
    },
    validate: (x) => assert.equal(x, true),
  });
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: from.resolve("aria-hidden"),
    vpm: root,
    cases,
    files: [
      "index.cjs",
      "package.json",
      "bench/compare.cjs",
      "../../scripts/aria-conformance/package-lock.json",
      "../../scripts/aria-conformance/node_modules/aria-hidden",
    ],
    cleanup: () => {
      for (const w of windows) w.close();
    },
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
