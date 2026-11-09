"use strict";
// Reconstruct the first independent implementation from immutable repository
// history. No second runtime copy is committed to the source tree.
const fs = require("node:fs"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process");
const revision = "552f1a3df695e4cc0f4846c22d272aa9742ffd04";
function prepare() {
  const directory = path.join(__dirname, "node_modules/.vky-baseline-552f1a3");
  fs.mkdirSync(directory, { recursive: true });
  for (const name of [
    "client.cjs",
    "index.cjs",
    "index.mjs",
    "legacy.cjs",
    "legacy.mjs",
    "package.json",
  ]) {
    const source = execFileSync(
      "git",
      ["show", revision + ":packages/vky/" + name],
      { cwd: path.resolve(__dirname, "../..") },
    );
    const file = path.join(directory, name);
    if (!fs.existsSync(file) || !fs.readFileSync(file).equals(source))
      fs.writeFileSync(file, source);
  }
  return directory;
}
module.exports = { prepare, revision };
if (require.main === module) console.log(prepare());
