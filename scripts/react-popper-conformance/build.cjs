"use strict";
const path = require("node:path"),
  fs = require("node:fs"),
  esbuild = require("esbuild");
const aliases = {
  react: path.join(__dirname, "node_modules/react"),
  "react-dom": path.join(__dirname, "node_modules/react-dom"),
};
for (const name of [
  "vfloating-ui-dom",
  "vfloating-ui-core",
  "vfloating-ui-utils",
  "vreact-fast-compare",
])
  aliases[name] = path.resolve(__dirname, "../../packages/" + name);
aliases["vfloating-ui-utils/dom"] = path.resolve(
  __dirname,
  "../../packages/vfloating-ui-utils/dom.mjs",
);
for (const variant of ["upstream-current", "vpm-current"]) {
  const out = __dirname + "/node_modules/.vpm-react-popper/" + variant;
  fs.mkdirSync(out, { recursive: true });
  esbuild.buildSync({
    entryPoints: [__dirname + "/browser-entry.jsx"],
    outfile: out + "/browser-entry.js",
    bundle: true,
    platform: "browser",
    format: "iife",
    alias: {
      ...aliases,
      "react-popper": variant.startsWith("vpm")
        ? path.resolve(__dirname, "../../packages/vreact-popper")
        : path.join(__dirname, "node_modules/react-popper"),
    },
    define: {
      VPM_VARIANT: JSON.stringify(variant),
      "process.env.NODE_ENV": JSON.stringify(
        process.env.VPM_REACT_MODE || "production",
      ),
    },
    logLevel: "silent",
  });
}
