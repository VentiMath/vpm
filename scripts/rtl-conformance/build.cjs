"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const source = fs
  .readFileSync(path.join(__dirname, "upstream/stylis-rtl.test.ts"), "utf8")
  .replace(/^import[^\n]+\n/gm, "");
const dir = path.join(__dirname, "node_modules/.vpm-rtl");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(
  path.join(dir, "tests.cjs"),
  new Bun.Transpiler({ loader: "ts" }).transformSync(source),
);
