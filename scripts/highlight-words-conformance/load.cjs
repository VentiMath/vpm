"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  Module = require("node:module");
module.exports = (entry) => {
  const filename = path.join(
      __dirname,
      "node_modules/.vpm-highlight/caller.cjs",
    ),
    unit = { exports: {} },
    local = Module.createRequire(filename);
  vm.runInThisContext(
    "(function(require,module,exports){" +
      fs.readFileSync(filename, "utf8") +
      "\n})",
    { filename },
  )(
    (id) => (id === "highlight-words" ? require(entry) : local(id)),
    unit,
    unit.exports,
  );
  return unit.exports.MRT_TableBodyCellValue;
};
