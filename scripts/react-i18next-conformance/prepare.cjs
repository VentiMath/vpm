"use strict";
const path = require("node:path"),
  fs = require("node:fs");
const output = path.join(
  __dirname,
  "node_modules/.vpm-react-i18next/runtime.cjs",
);
fs.mkdirSync(path.dirname(output), { recursive: true });
require("esbuild").buildSync({
  entryPoints: [
    path.resolve(__dirname, "../../packages/vreact-i18next/index.cjs"),
  ],
  outfile: output,
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["react"],
  logLevel: "silent",
});
module.exports = output;
