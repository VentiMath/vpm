"use strict";
const fs = require("node:fs"),
  Module = require("node:module"),
  vm = require("node:vm");
module.exports = function load(entry) {
  const filename = require.resolve("react-autosuggest/dist/Autowhatever");
  const unit = { exports: {} };
  const original = Module.createRequire(filename);
  const localRequire = (id) =>
    id === "section-iterator" ? require(entry) : original(id);
  vm.runInThisContext(
    "(function(require,module,exports){" +
      fs.readFileSync(filename, "utf8") +
      "\n})",
    { filename },
  )(localRequire, unit, unit.exports);
  return unit.exports.default;
};
