"use strict";
const fs = require("node:fs"),
  esbuild = require("esbuild"),
  base = __dirname + "/node_modules/.vpm-engine";
for (const version of ["current", "app"])
  for (const own of [false, true]) {
    const name = version + "-" + (own ? "vpm" : "upstream"),
      dir = base + "/" + name;
    fs.mkdirSync(dir, { recursive: true });
    const alias = require("./aliases.cjs")(own, version);
    esbuild.buildSync({
      entryPoints: [__dirname + "/caller-entry.jsx"],
      outfile: dir + "/caller.cjs",
      bundle: true,
      platform: "node",
      format: "cjs",
      external: ["react", "react-dom/server"],
      alias,
      define: { "process.env.NODE_ENV": '"production"' },
      logLevel: "silent",
    });
    esbuild.buildSync({
      entryPoints: [__dirname + "/browser-entry.jsx"],
      outfile: dir + "/browser.js",
      bundle: true,
      platform: "browser",
      format: "iife",
      alias: {
        ...alias,
        react: __dirname + "/node_modules/react",
        "react-dom": __dirname + "/node_modules/react-dom",
      },
      define: {
        VPM_VARIANT: JSON.stringify(name),
        "process.env.NODE_ENV": JSON.stringify(
          process.env.VPM_REACT_MODE || "production",
        ),
      },
      logLevel: "silent",
    });
  }
module.exports = base;
