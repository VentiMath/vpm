"use strict";
// Benchmark the previous implementation directly from immutable history.
const fs = require("node:fs"),
  path = require("node:path");
const { execFileSync } = require("node:child_process");
const revision = "453b9dfd0926c95afaf959cc9a5e7ce0bb50bc21";
function prepare() {
  const directory = path.join(
    __dirname,
    "node_modules/.vmotion-baseline-453b9dfd",
  );
  fs.mkdirSync(directory, { recursive: true });
  const source = execFileSync(
    "git",
    ["show", revision + ":packages/vmotion-utils/index.cjs"],
    { cwd: path.resolve(__dirname, "../..") },
  );
  const file = path.join(directory, "index.cjs");
  if (!fs.existsSync(file) || !fs.readFileSync(file).equals(source))
    fs.writeFileSync(file, source);
  return file;
}
module.exports = { prepare, revision };
