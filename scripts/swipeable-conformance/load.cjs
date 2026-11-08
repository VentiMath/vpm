"use strict";
const fs = require("node:fs"),
  vm = require("node:vm"),
  Module = require("node:module");
module.exports = (entry, react = require("react")) => {
  const filename = require.resolve(entry),
    local = Module.createRequire(filename),
    unit = { exports: {} };
  vm.runInThisContext(
    "(function(require,module,exports){" +
      fs.readFileSync(filename, "utf8") +
      "\n})",
    { filename },
  )((id) => (id === "react" ? react : local(id)), unit, unit.exports);
  return unit.exports;
};
