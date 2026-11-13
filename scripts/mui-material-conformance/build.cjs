"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const { fixture, packages, esbuild } = require("./paths.cjs"),
  base = fixture + "/node_modules/.vpm-material";
for (const version of ["current", "app"])
  for (const own of [false, true]) {
    const name = version + "-" + (own ? "vpm" : "upstream");
    fs.mkdirSync(base + "/" + name, { recursive: true });
    const alias = require("../mui-system-conformance/aliases.cjs")(
      own,
      version,
    );
    if (own && process.env.VPM_MATERIAL_INSTALL)
      for (const key of Object.keys(alias))
        alias[key] = alias[key].replace(
          path.resolve(__dirname, "../../packages"),
          packages,
        );
    const entry = own
      ? packages + "/vmui-material/index.cjs"
      : alias["@mui/material"] + "/index.js";
    alias["@buttons"] = entry;
    esbuild.buildSync({
      stdin: {
        contents:
          "const React=require('react');const {Scene}=require('./scene.jsx');const buttons=require('@buttons');module.exports={Scene,buttons,render:p=>require('react-dom/server').renderToString(React.createElement(Scene,p))};",
        resolveDir: __dirname,
      },
      outfile: base + "/" + name + "/ssr.cjs",
      bundle: true,
      nodePaths: [fixture + "/node_modules"],
      platform: "node",
      format: "cjs",
      alias,
      external: ["react", "react-dom/server"],
      define: { "process.env.NODE_ENV": '"production"' },
      logLevel: "silent",
    });
    esbuild.buildSync({
      entryPoints: [__dirname + "/bench-entry.jsx"],
      outfile: base + "/" + name + "/bench.cjs",
      bundle: true,
      nodePaths: [fixture + "/node_modules"],
      platform: "node",
      format: "cjs",
      alias,
      external: ["react", "react-dom/server"],
      define: { "process.env.NODE_ENV": '"production"' },
      logLevel: "silent",
    });
    esbuild.buildSync({
      entryPoints: [__dirname + "/browser-entry.jsx"],
      outfile: base + "/" + name + "/browser.js",
      bundle: true,
      nodePaths: [fixture + "/node_modules"],
      platform: "browser",
      format: "iife",
      alias: {
        ...alias,
        react: fixture + "/node_modules/react",
        "react-dom": fixture + "/node_modules/react-dom",
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
console.log(
  "Built current/app Material controls and independent button family",
);
