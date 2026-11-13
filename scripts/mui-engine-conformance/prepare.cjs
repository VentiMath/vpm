"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const output = __dirname + "/node_modules/.vpm-engine/runtime.cjs";
fs.mkdirSync(path.dirname(output), { recursive: true });
require("esbuild").buildSync({
  entryPoints: [
    path.resolve(__dirname, "../../packages/vmui-styled-engine/index.cjs"),
  ],
  outfile: output,
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["react"],
  alias: require("./aliases.cjs")(true),
  logLevel: "silent",
  define: { "process.env.NODE_ENV": '"production"' },
});
module.exports = output;
