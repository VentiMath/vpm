"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, ".."),
  fixtureDir = path.resolve(
    root,
    "../../scripts/perfect-scrollbar-conformance",
  ),
  { fixture } = require(path.join(fixtureDir, "dom.cjs"));
const resources = [];
function setup(file) {
  const f = fixture();
  resources.push(f);
  const Ps = require(file);
  const style = f.win.document.createElement("style");
  style.textContent = fs.readFileSync(
    path.join(
      file.includes("node_modules/perfect-scrollbar")
        ? path.join(fixtureDir, "node_modules/perfect-scrollbar")
        : root,
      "css/perfect-scrollbar.css",
    ),
    "utf8",
  );
  f.win.document.head.append(style);
  return { f, Ps };
}
const cases = [
  {
    name: "construct and destroy desktop scrollbar",
    make(file) {
      const { f, Ps } = setup(file);
      return () => {
        const p = new Ps(f.element, {
          wheelPropagation: true,
          suppressScrollX: true,
        });
        const active = p.scrollbarYActive;
        p.destroy();
        return active && f.element.children.length === 1;
      };
    },
    validate: (x) => assert.equal(x, true),
  },
  {
    name: "unchanged geometry update",
    make(file) {
      const { f, Ps } = setup(file),
        p = new Ps(f.element);
      return () => {
        p.update();
        return [p.scrollbarXActive, p.scrollbarYActive, p.containerHeight];
      };
    },
    validate: (x) => assert.deepEqual(x, [true, true, 100]),
  },
  {
    name: "native scroll event and thumb update",
    make(file) {
      const { f, Ps } = setup(file),
        p = new Ps(f.element);
      let i = 0;
      return () => {
        f.element.scrollTop = (++i % 2) * 200;
        f.element.dispatchEvent(new f.win.Event("scroll"));
        return p.scrollbarYTop;
      };
    },
    validate: (x) => assert.ok(Number.isFinite(x) && x >= 0),
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: require.resolve(
      path.join(fixtureDir, "node_modules/perfect-scrollbar"),
    ),
    vpm: path.join(root, "index.cjs"),
    cases,
    files: [
      "index.cjs",
      "index.mjs",
      "geometry.cjs",
      "css/perfect-scrollbar.css",
      "package.json",
      "PROVENANCE.json",
      "bench/run.cjs",
      "../../scripts/perfect-scrollbar-conformance/dom.cjs",
      "../../scripts/perfect-scrollbar-conformance/package-lock.json",
      "../../scripts/perfect-scrollbar-conformance/node_modules/perfect-scrollbar",
    ],
    cleanup: () => {
      for (const f of resources) f.close();
    },
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
