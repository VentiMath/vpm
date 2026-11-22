"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const modules = path.join(__dirname, "node_modules");
module.exports = function stageDiagnostics(
  tokens,
  version,
  { compiler = false } = {},
) {
  const dir = fs.mkdtempSync(path.join(modules, ".vpm-diagnostics-"));
  const scope = path.join(dir, "node_modules/@babel");
  try {
    fs.mkdirSync(scope, { recursive: true });
    const frame = path.join(scope, "code-frame");
    const source = path.isAbsolute(version)
      ? version
      : path.join(modules, version);
    fs.cpSync(source, frame, { recursive: true });
    if (path.isAbsolute(version)) {
      for (const name of Object.keys(
        require(path.join(source, "package.json")).dependencies,
      ))
        fs.symlinkSync(
          require
            .resolve(name + "/package.json", { paths: [source] })
            .replace(/\/package\.json$/, ""),
          path.join(dir, "node_modules", name),
        );
    }
    fs.symlinkSync(tokens, path.join(dir, "node_modules/js-tokens"));
    if (!path.isAbsolute(version))
      assert.equal(
        createRequire(path.join(frame, "package.json")).resolve("js-tokens"),
        require.resolve(tokens),
      );
    const api = {
      frame: require(frame),
      close: () => fs.rmSync(dir, { recursive: true, force: true }),
    };
    if (compiler) {
      const core = path.join(scope, "core");
      fs.cpSync(path.join(modules, "@babel/core"), core, { recursive: true });
      assert.equal(
        createRequire(path.join(core, "package.json")).resolve(
          "@babel/code-frame",
        ),
        require.resolve(frame),
      );
      api.core = require(core);
    }
    return api;
  } catch (e) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw e;
  }
};
