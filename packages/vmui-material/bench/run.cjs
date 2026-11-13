"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/mui-system-conformance"),
  base = fixture + "/node_modules/.vpm-material";
const cases = [];
for (const version of ["current", "app"])
  for (const kind of ["buttons", "icons", "toggles"])
    cases.push({
      name: (version === "current" ? "Material9 " : "App7 ") + kind + " SSR",
      make(file) {
        return require(
          base +
            "/" +
            version +
            "-" +
            (file === root ? "vpm" : "upstream") +
            "/bench.cjs",
        ).prepare(kind);
      },
      validate(html) {
        assert.equal(
          (html.match(/<button /g) || []).length,
          kind === "toggles" ? 7 : 12,
        );
        if (kind === "toggles")
          assert.equal((html.match(/aria-pressed="true"/g) || []).length, 2);
        else assert.match(html, /disabled=""/);
      },
    });
const files = [
  "buttons.cjs",
  "index.cjs",
  "package.json",
  "PROVENANCE.json",
  "bench/run.cjs",
  "../../scripts/mui-material-conformance/bench-entry.jsx",
  "../../scripts/mui-material-conformance/build.cjs",
  "../../scripts/mui-system-conformance/package-lock.json",
];
for (const name of [
  "vmui-system",
  "vmui-utils",
  "vmui-private-theming",
  "vmui-styled-engine",
  ...fs
    .readdirSync(path.resolve(root, ".."))
    .filter((n) => n.startsWith("vemotion-")),
])
  for (const f of fs.readdirSync(path.resolve(root, "..", name)))
    if (/\.(cjs|js|mjs)$/.test(f)) files.push("../" + name + "/" + f);
for (const version of ["current", "app"])
  for (const own of ["vpm", "upstream"])
    files.push(
      "../../scripts/mui-system-conformance/node_modules/.vpm-material/" +
        version +
        "-" +
        own +
        "/bench.cjs",
    );
require("../../../scripts/bench-process.cjs")
  .run({ root, upstream: "upstream", vpm: root, cases, files })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
