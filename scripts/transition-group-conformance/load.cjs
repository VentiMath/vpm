"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
module.exports = (
  entry = process.env.VPM_TRANSITION_ENTRY ||
    path.resolve(__dirname, "../../packages/vreact-transition-group"),
) => {
  if (entry.includes("node_modules/react-transition-group"))
    return require(entry);
  const unit = { exports: {} },
    file = path.join(entry, "index.cjs");
  vm.runInThisContext(
    "(function(require,module,exports){" +
      fs.readFileSync(file, "utf8") +
      "\n})",
    { filename: file },
  )(
    (id) => {
      if (id !== "react") throw Error("Unexpected dependency: " + id);
      return require("react");
    },
    unit,
    unit.exports,
  );
  return unit.exports;
};
