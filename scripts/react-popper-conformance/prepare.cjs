"use strict";
const path = require("node:path"),
  fs = require("node:fs"),
  esbuild = require("esbuild");
const output = __dirname + "/node_modules/.vpm-react-popper/runtime.cjs",
  alias = {};
for (const name of [
  "vfloating-ui-dom",
  "vfloating-ui-core",
  "vfloating-ui-utils",
  "vreact-fast-compare",
])
  alias[name] = path.resolve(__dirname, "../../packages/" + name);
alias["vfloating-ui-utils/dom"] = path.resolve(
  __dirname,
  "../../packages/vfloating-ui-utils/dom.mjs",
);
fs.mkdirSync(path.dirname(output), { recursive: true });
esbuild.buildSync({
  entryPoints: [
    path.resolve(__dirname, "../../packages/vreact-popper/index.cjs"),
  ],
  outfile: output,
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["react"],
  alias,
  logLevel: "silent",
});
module.exports = output;
