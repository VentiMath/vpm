"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const { fixture, root, packages, peer, esbuild } = require("./paths.cjs");
const out = path.join(fixture, "node_modules/.vpm-material");
fs.mkdirSync(out, { recursive: true });
const alias = Object.fromEntries(
  fs.readdirSync(root + "/packages").map((n) => [n, packages + "/" + n]),
);
esbuild.buildSync({
  stdin: {
    contents: 'module.exports=require("./index.cjs")',
    resolveDir: packages + "/vmui-material",
  },
  outfile: out + "/own-" + process.pid + ".cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["react", "react-dom"],
  alias,
  logLevel: "silent",
});
module.exports = out + "/own-" + process.pid + ".cjs";
