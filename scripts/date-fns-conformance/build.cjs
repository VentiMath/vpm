"use strict";
const path = require("node:path"),
  fs = require("node:fs"),
  esbuild = require("esbuild");
const out = path.join(__dirname, "node_modules/.vpm-date-fns");
for (const variant of ["upstream", "app", "vpm"]) {
  const packagePath =
    variant === "upstream"
      ? path.join(__dirname, "node_modules/date-fns")
      : variant === "app"
        ? path.join(__dirname, "node_modules/date-fns-app")
        : path.resolve(__dirname, "../../packages/vdate-fns");
  fs.mkdirSync(path.join(out, variant), { recursive: true });
  for (const [entry, platform] of [
    ["adapter-entry.cjs", "node"],
    ["browser-entry.jsx", "browser"],
  ]) {
    if (!fs.existsSync(path.join(__dirname, entry))) continue;
    esbuild.buildSync({
      entryPoints: [path.join(__dirname, entry)],
      outfile: path.join(
        out,
        variant,
        platform === "node" ? "adapter.cjs" : "browser-entry.js",
      ),
      platform,
      resolveExtensions: [
        ".tsx",
        ".ts",
        ".jsx",
        ".js",
        ".mjs",
        ".cjs",
        ".json",
      ],
      format: platform === "node" ? "cjs" : "iife",
      bundle: true,
      alias: { "date-fns": packagePath },
      define: {
        "process.env.NODE_ENV": '"production"',
        VPM_DATE_VARIANT: JSON.stringify(variant),
      },
      logLevel: "silent",
    });
  }
}
