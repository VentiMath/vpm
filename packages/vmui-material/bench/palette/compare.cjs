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
  "createPalette.js",
);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-palette-bench-")),
  vpm = path.join(dir, "palette.cjs");
esbuild.buildSync({
  entryPoints: [root + "/styles/createPalette.cjs"],
  outfile: vpm,
  platform: "node",
  format: "cjs",
  bundle: true,
  nodePaths: [packages, fixture + "/node_modules"],
});
process.once("exit", () => fs.rmSync(dir, { recursive: true, force: true }));
const cases = [
  {},
  { mode: "dark" },
  {
    mode: "light",
    primary: { main: "#245678" },
    secondary: { main: "#875432" },
    background: { paper: "#fff", default: "#f7f7f7" },
    text: { secondary: "rgba(0, 0, 0, 0.6)" },
  },
].map((options, index) => ({
  name: ["Default palette", "Dark palette", "Custom theme palette"][index],
  make(lib) {
    const create = require(lib).default;
    return () => create(options);
  },
  validate(p) {
    assert.equal(p.mode, options.mode || "light");
    assert.ok(p.primary.contrastText);
    assert.equal(
      p.background.paper,
      options.mode === "dark" ? "#121212" : "#fff",
    );
  },
}));
require("../../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm,
    cases,
    files: [
      "palette.cjs",
      "styles/createPalette.cjs",
      "bench/palette/compare.cjs",
      path.relative(root, upstream),
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
