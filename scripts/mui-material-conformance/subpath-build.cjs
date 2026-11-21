"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const { fixture, packages, esbuild } = require("./paths.cjs");
const base = path.join(fixture, "node_modules/.vpm-material");
module.exports = function buildUnit(unit, component, specifier) {
  for (const version of ["current", "app"])
    for (const own of [false, true]) {
      const dir = path.join(base, version + (own ? "-vpm" : "-upstream"));
      fs.mkdirSync(dir, { recursive: true });
      const alias = require("../mui-system-conformance/aliases.cjs")(
        own,
        version,
      );
      for (const key of Object.keys(alias)) {
        const installed = alias[key].replace(
          path.resolve(__dirname, "../../packages"),
          packages,
        );
        if (fs.existsSync(installed)) alias[key] = installed;
      }
      alias[specifier] = own
        ? packages + "/vmui-material/" + component + ".mjs"
        : alias["@mui/material"] + "/" + component + "/index.js";
      for (const browser of [true, false]) {
        const kind = browser ? "browser" : "ssr";
        esbuild.buildSync({
          entryPoints: [path.join(__dirname, unit + "-" + kind + "-entry.jsx")],
          outfile: path.join(
            dir,
            unit + "-" + kind + (browser ? ".js" : ".cjs"),
          ),
          bundle: true,
          nodePaths: [fixture + "/node_modules"],
          platform: browser ? "browser" : "node",
          format: browser ? "iife" : "cjs",
          alias: browser
            ? {
                ...alias,
                react: fixture + "/node_modules/react",
                "react-dom": fixture + "/node_modules/react-dom",
              }
            : alias,
          external: browser ? [] : ["react", "react-dom/server"],
          define: {
            "process.env.NODE_ENV": JSON.stringify(
              process.env.VPM_REACT_MODE || "production",
            ),
          },
          logLevel: "silent",
        });
      }
    }
  return base;
};
