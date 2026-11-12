"use strict";
const path = require("node:path"),
  fs = require("node:fs"),
  esbuild = require("esbuild");
for (const variant of [
  "upstream-current",
  "vpm-current",
  "upstream-app",
  "vpm-app",
]) {
  const out = __dirname + "/node_modules/.vpm-jwt-decode/" + variant;
  fs.mkdirSync(out, { recursive: true });
  esbuild.buildSync({
    entryPoints: [__dirname + "/browser-entry.js"],
    outfile: out + "/browser-entry.js",
    bundle: true,
    platform: "browser",
    format: "iife",
    alias: {
      "jwt-decode": variant.startsWith("vpm")
        ? path.resolve(__dirname, "../../packages/vjwt-decode")
        : path.join(
            __dirname,
            "node_modules",
            variant.endsWith("app") ? "jwt-decode-app" : "jwt-decode",
          ),
    },
    define: { VPM_VARIANT: JSON.stringify(variant) },
    logLevel: "silent",
  });
}
