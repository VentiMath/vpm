"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  { createRequire } = require("node:module");
module.exports = function (version, Rope) {
  const file = require.resolve(version),
    original = createRequire(file),
    module = { exports: {} };
  const factory = new Function(
    "require",
    "module",
    "exports",
    "__filename",
    "__dirname",
    fs.readFileSync(file, "utf8"),
  );
  factory(
    (name) => (name === "rope-sequence" ? Rope : original(name)),
    module,
    module.exports,
    file,
    path.dirname(file),
  );
  return module.exports;
};
