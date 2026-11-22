"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { createRequire } = require("node:module");
module.exports = function stage(implementation, version) {
  const modules = path.join(__dirname, "node_modules"),
    dir = fs.mkdtempSync(path.join(modules, ".vpm-options-"));
  const scope = path.join(dir, "node_modules/@babel");
  try {
    fs.mkdirSync(scope, { recursive: true });
    const targets = path.join(scope, "helper-compilation-targets"),
      core = path.join(scope, "core");
    fs.cpSync(path.join(modules, version), targets, { recursive: true });
    fs.cpSync(path.join(modules, "@babel/core"), core, { recursive: true });
    fs.symlinkSync(implementation, path.join(scope, "helper-validator-option"));
    assert.equal(
      createRequire(path.join(targets, "package.json")).resolve(
        "@babel/helper-validator-option",
      ),
      require.resolve(implementation),
    );
    assert.equal(
      createRequire(path.join(core, "package.json")).resolve(
        "@babel/helper-compilation-targets",
      ),
      require.resolve(targets),
    );
    return {
      targets: require(targets).default,
      core: require(core),
      close: () => fs.rmSync(dir, { recursive: true, force: true }),
    };
  } catch (e) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw e;
  }
};
