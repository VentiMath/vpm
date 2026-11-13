"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const out = __dirname + "/node_modules/.vpm-utils/runtime.cjs";
fs.mkdirSync(path.dirname(out), { recursive: true });
require("esbuild").buildSync({
  entryPoints: [path.resolve(__dirname, "../../packages/vmui-utils/index.cjs")],
  outfile: out,
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["react"],
  alias: { vclsx: path.resolve(__dirname, "../../packages/vclsx") },
  logLevel: "silent",
});
require("esbuild").buildSync({
  entryPoints: [__dirname + "/internals-entry.cjs"],
  outfile: out.replace("runtime.cjs", "internals.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["react"],
  alias: { vclsx: path.resolve(__dirname, "../../packages/vclsx") },
  logLevel: "silent",
});
module.exports = out;
