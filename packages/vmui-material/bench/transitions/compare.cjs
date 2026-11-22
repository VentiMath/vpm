"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os");
const {
  peer,
  esbuild,
  fixture,
  packages,
} = require("../../../../scripts/mui-material-conformance/paths.cjs");
const root = path.resolve(__dirname, "../..");
const upstream = path.join(
  path.dirname(peer.resolve("mui-material-app/styles")),
  "createTransitions.js",
);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-transitions-bench-")),
  vpm = path.join(dir, "transition-settings.cjs");
esbuild.buildSync({
  entryPoints: [root + "/styles/createTransitions.cjs"],
  outfile: vpm,
  platform: "node",
  format: "cjs",
  bundle: true,
  nodePaths: [packages, fixture + "/node_modules"],
});
process.once("exit", () => fs.rmSync(dir, { recursive: true, force: true }));
const cases = [
  {
    name: "Create transition settings",
    make(lib) {
      const create = require(lib).default;
      return () => create({});
    },
    validate: (t) => assert.equal(t.duration.standard, 300),
  },
  {
    name: "Page margin transition",
    make(lib) {
      const t = require(lib).default({});
      return () =>
        t.create("margin", {
          easing: t.easing.sharp,
          duration: t.duration.leavingScreen,
        });
    },
    validate: (r) =>
      assert.equal(r, "margin 195ms cubic-bezier(0.4, 0, 0.6, 1) 0ms"),
  },
  {
    name: "Side-panel transitions",
    make(lib) {
      const t = require(lib).default({});
      return () =>
        t.create(["transform", "width", "min-width"], {
          easing: t.easing.sharp,
          duration: t.duration.shorter,
        });
    },
    validate: (r) => assert.equal(r.split("200ms").length, 4),
  },
];
require("../../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm,
    cases,
    files: [
      "transition-settings.cjs",
      "styles/createTransitions.cjs",
      "bench/transitions/compare.cjs",
      path.relative(root, upstream),
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
