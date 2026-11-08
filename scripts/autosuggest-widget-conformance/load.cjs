"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
module.exports = function load(
  entry = process.env.VPM_WIDGET_ENTRY ||
    path.resolve(__dirname, "../../packages/vreact-autosuggest"),
) {
  if (entry.includes("node_modules/react-autosuggest")) return require(entry);
  const file = path.join(entry, "index.cjs"),
    unit = { exports: {} };
  const native = require("node:module").createRequire(file);
  const resolve = (id) => (id === "react" ? require("react") : native(id));
  vm.runInThisContext(
    "(function(require,module,exports){" +
      fs.readFileSync(file, "utf8") +
      "\n})",
    { filename: file },
  )(resolve, unit, unit.exports);
  return unit.exports;
};
