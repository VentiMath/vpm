"use strict";
// The app's unchanged npm date pickers, bundled once with the npm Material they
// were installed against and once with every Material import mapped to VPM.
const fs = require("node:fs"),
  path = require("node:path");
const { fixture, root, packages, esbuild } = require("./paths.cjs");
const pickers = path.resolve(__dirname, "../date-fns-conformance/node_modules");
const base = path.join(fixture, "node_modules/.vpm-material");
const { names } = require("../pack-app-release.cjs").configs["vmui-material"];
const runtime = (target) =>
  typeof target === "string"
    ? /\.(?:mjs|cjs|js)$/.test(target)
      ? target
      : undefined
    : target && (runtime(target.import) || runtime(target.default));
function ownAliases() {
  const alias = require("../mui-system-conformance/aliases.cjs")(
    true,
    "app",
    true,
  );
  for (const key of Object.keys(alias)) {
    const installed = alias[key].replace(root + "/packages", packages);
    if (fs.existsSync(installed)) alias[key] = installed;
  }
  // The release's own mapping: each upstream import name and exported subpath
  // goes to the file a bundler selects from the VPM package.
  for (const name of names) {
    const dir = path.join(packages, name),
      meta = JSON.parse(fs.readFileSync(dir + "/package.json")),
      { upstream } = JSON.parse(fs.readFileSync(dir + "/PROVENANCE.json")),
      original = upstream.name || upstream.package;
    for (const [key, target] of Object.entries(
      meta.exports || { ".": meta.module || meta.main },
    )) {
      const file = runtime(target);
      if (key === "./package.json" || key.includes("*") || !file) continue;
      alias[original + key.slice(1)] = path.join(dir, file);
    }
  }
  return alias;
}
for (const own of [false, true]) {
  const dir = path.join(base, "app-" + (own ? "vpm" : "upstream"));
  fs.mkdirSync(dir, { recursive: true });
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, "pickers-browser-entry.jsx")],
    outfile: path.join(dir, "pickers-browser.js"),
    bundle: true,
    nodePaths: [pickers],
    platform: "browser",
    format: "iife",
    alias: {
      ...(own ? ownAliases() : {}),
      react: pickers + "/react",
      "react-dom": pickers + "/react-dom",
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        process.env.VPM_REACT_MODE || "production",
      ),
    },
    logLevel: "silent",
  });
}
module.exports = base;
