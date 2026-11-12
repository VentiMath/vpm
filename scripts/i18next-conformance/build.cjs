"use strict";
const path = require("node:path"),
  fs = require("node:fs"),
  esbuild = require("esbuild"),
  out = __dirname + "/node_modules/.vpm-i18next";
for (const variant of [
  "upstream-current",
  "vpm-current",
  "upstream-app",
  "vpm-app",
]) {
  const app = variant.endsWith("-app"),
    vpm = variant.startsWith("vpm");
  fs.mkdirSync(out + "/" + variant, { recursive: true });
  esbuild.buildSync({
    entryPoints: [__dirname + "/browser-entry.jsx"],
    outfile: out + "/" + variant + "/browser-entry.js",
    platform: "browser",
    format: "iife",
    bundle: true,
    alias: {
      i18next: vpm
        ? path.resolve(__dirname, "../../packages/vi18next")
        : path.join(__dirname, "node_modules", app ? "i18next-app" : "i18next"),
      "react-i18next": path.join(
        __dirname,
        "node_modules",
        app ? "react-i18next-app" : "react-i18next",
      ),
    },
    define: {
      "process.env.NODE_ENV": '"production"',
      VPM_I18N_VARIANT: JSON.stringify(variant),
    },
    logLevel: "silent",
  });
}
