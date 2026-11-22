"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { createRequire } = require("node:module");
module.exports = function stage(
  implementation,
  version = "@babel/helper-compilation-targets",
) {
  const modules = path.join(__dirname, "node_modules"),
    dir = fs.mkdtempSync(path.join(modules, ".vpm-semver-"));
  try {
    const scope = path.join(dir, "node_modules/@babel");
    fs.mkdirSync(scope, { recursive: true });
    const core = path.join(scope, "core"),
      targets = path.join(scope, "helper-compilation-targets");
    fs.cpSync(path.join(modules, "@babel/core"), core, { recursive: true });
    fs.cpSync(path.join(modules, version), targets, { recursive: true });
    fs.symlinkSync(implementation, path.join(dir, "node_modules/semver"));
    for (const folder of [core, targets])
      assert.equal(
        createRequire(path.join(folder, "package.json")).resolve("semver"),
        require.resolve(implementation),
      );
    return {
      core: require(core),
      targets: require(targets).default,
      close: () => fs.rmSync(dir, { recursive: true, force: true }),
    };
  } catch (e) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw e;
  }
};
