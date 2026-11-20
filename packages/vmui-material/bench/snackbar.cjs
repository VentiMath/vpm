"use strict";
process.env.NODE_ENV = "production";
const path = require("node:path"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/mui-system-conformance"),
  base = fixture + "/node_modules/.vpm-material";
const cases = [];
for (const version of ["current", "app"])
  for (const kind of ["open", "closed"])
    cases.push({
      name: (version === "current" ? "Material9 " : "App7 ") + kind + " Snackbar SSR",
      make(file) {
        return require(
          base + "/" + version + "-" + (file === root ? "vpm" : "upstream") + "/snackbar-bench.cjs",
        ).prepare(kind);
      },
      validate(html) {
        const markup = html.replace(/<style[\s\S]*?<\/style>/g, "");
        assert.equal((markup.match(/role="alert"/g) || []).length, kind === "open" ? 8 : 0);
        assert.equal((markup.match(/Link copied to clipboard/g) || []).length, kind === "open" ? 8 : 0);
      },
    });
const files = [
  ...fs.readdirSync(root).filter((f) => /\.(cjs|mjs)$/.test(f)),
  "package.json",
  "PROVENANCE.json",
  "bench/snackbar.cjs",
  "../../scripts/mui-material-conformance/snackbar-bench-entry.jsx",
  "../../scripts/mui-material-conformance/snackbar-scene.jsx",
  "../../scripts/mui-material-conformance/snackbar-build.cjs",
  "../../scripts/mui-system-conformance/package-lock.json",
];
for (const name of [
  "vmui-system",
  "vmui-utils",
  "vmui-private-theming",
  "vmui-styled-engine",
  ...fs.readdirSync(path.resolve(root, "..")).filter((n) => n.startsWith("vemotion-")),
])
  for (const f of fs.readdirSync(path.resolve(root, "..", name)))
    if (/\.(cjs|js|mjs)$/.test(f)) files.push("../" + name + "/" + f);
for (const name of fs.readdirSync(path.resolve(root, "..")).filter((n) => n.startsWith("vemotion-")))
  if (fs.existsSync(path.resolve(root, "..", name, "src"))) files.push("../" + name + "/src");
for (const version of ["current", "app"])
  for (const own of ["upstream", "vpm"])
    for (const unit of ["snackbar"])
      files.push(
        "../../scripts/mui-system-conformance/node_modules/.vpm-material/" +
          version +
          "-" +
          own +
          "/" +
          unit +
          "-bench.cjs",
      );
require("../../../scripts/bench-process.cjs")
  .run({ root, upstream: "upstream", vpm: root, cases, files })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
