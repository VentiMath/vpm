"use strict";
const path = require("node:path"),
  fs = require("node:fs"),
  esbuild = require("esbuild"),
  out = __dirname + "/node_modules/.vpm-react-i18next";
for (const variant of [
  "upstream-current",
  "vpm-current",
  "upstream-app",
  "vpm-app",
  "upstream-engine",
  "vpm-engine",
]) {
  const app = variant.endsWith("-app"),
    engine = variant.endsWith("-engine"),
    vpm = variant.startsWith("vpm");
  fs.mkdirSync(out + "/" + variant, { recursive: true });
  esbuild.buildSync({
    entryPoints: [__dirname + "/browser-entry.jsx"],
    outfile: out + "/" + variant + "/browser-entry.js",
    platform: "browser",
    format: "iife",
    bundle: true,
    alias: {
      react: path.join(__dirname, "node_modules/react"),
      "react-dom": path.join(__dirname, "node_modules/react-dom"),
      i18next: engine
        ? path.resolve(__dirname, "../../packages/vi18next")
        : path.join(__dirname, "node_modules", app ? "i18next-app" : "i18next"),
      "react-i18next": vpm
        ? path.resolve(__dirname, "../../packages/vreact-i18next")
        : path.join(
            __dirname,
            "node_modules",
            app ? "react-i18next-app" : "react-i18next",
          ),
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        process.env.VPM_REACT_MODE || "production",
      ),
      VPM_REACT_I18N_VARIANT: JSON.stringify(variant),
    },
    logLevel: "silent",
  });
}
