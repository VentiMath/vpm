"use strict";
// Reconstruct the previous implementation from immutable history, never from a
// committed duplicate runtime. Both implementations use their own module state.
const fs = require("node:fs"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process");
const revision = "88dea27fb126f03403478d582828a37db51d2af1";
function prepare() {
  const root = path.resolve(__dirname, "../.."),
    dir = path.join(__dirname, "node_modules/.effects-before-88dea27f");
  const files = [
    "index.cjs",
    "index.mjs",
    "effects.cjs",
    "frame.cjs",
    "value.cjs",
    "mapping.cjs",
    "playback.cjs",
    "spring.cjs",
    "package.json",
  ];
  for (const [pkg, names, target] of [
    ["vmotion-dom", files, dir],
    [
      "vmotion-utils",
      ["index.cjs", "package.json"],
      path.join(dir, "node_modules/vmotion-utils"),
    ],
  ]) {
    fs.mkdirSync(target, { recursive: true });
    for (const name of names) {
      const source = execFileSync(
        "git",
        ["show", `${revision}:packages/${pkg}/${name}`],
        { cwd: root },
      );
      const file = path.join(target, name);
      if (!fs.existsSync(file) || !fs.readFileSync(file).equals(source))
        fs.writeFileSync(file, source);
    }
  }
  return path.join(dir, "index.cjs");
}
module.exports = { prepare, revision };
