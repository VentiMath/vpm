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
  "createTypography.js",
);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-typography-bench-")),
  vpm = path.join(dir, "type-scale.cjs");
esbuild.buildSync({
  entryPoints: [root + "/styles/createTypography.cjs"],
  outfile: vpm,
  platform: "node",
  format: "cjs",
  bundle: true,
  nodePaths: [packages, fixture + "/node_modules"],
});
process.once("exit", () => fs.rmSync(dir, { recursive: true, force: true }));
const cases = [
  {},
  {
    fontFamily: 'Geist,Roboto,"Helvetica",Arial,sans-serif',
    fontSize: 13,
    htmlFontSize: 16,
    body1: { fontSize: "0.8125rem" },
    body2: { fontSize: "0.8125rem" },
  },
  {
    fontFamily: "Example Sans",
    fontSize: 16,
    allVariants: { color: "#234" },
    h1: { "@media (min-width:600px)": { fontSize: "4rem" } },
  },
].map((options, index) => ({
  name: ["Default scale", "App Geist scale", "Responsive variant overrides"][
    index
  ],
  make(lib) {
    const create = require(lib).default;
    return () => create({}, options);
  },
  validate(t) {
    assert.equal(t.fontSize, options.fontSize || 14);
    assert.equal(t.h1.lineHeight, 1.167);
    assert.equal(typeof t.pxToRem(16), "string");
  },
}));
require("../../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm,
    cases,
    files: [
      "type-scale.cjs",
      "styles/createTypography.cjs",
      "bench/typography/compare.cjs",
      path.relative(root, upstream),
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
