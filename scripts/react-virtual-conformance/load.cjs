"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  { createRequire } = require("node:module");
const peer = process.env.VPM_REACT_CONSUMER
  ? createRequire(path.join(process.env.VPM_REACT_CONSUMER, "package.json"))
  : require;
function load(entry, controlledCore) {
  const file = fs.statSync(entry).isDirectory()
    ? path.join(entry, "index.cjs")
    : entry;
  const unit = { exports: {} },
    local = createRequire(file);
  vm.runInThisContext(
    "(function(require,module,exports){" +
      fs.readFileSync(file, "utf8") +
      "\n})",
    { filename: file },
  )(
    (id) => {
      if (id === "react" || id.startsWith("react-dom")) return peer(id);
      if (id === "vtanstack-virtual-core")
        return require(
          process.env.VPM_VIRTUAL_ENTRY ||
            path.resolve(__dirname, "../../packages/vtanstack-virtual-core"),
        );
      if (id === "@tanstack/virtual-core" && controlledCore)
        return controlledCore;
      return local(id);
    },
    unit,
    unit.exports,
  );
  return unit.exports;
}
module.exports = {
  load,
  peer,
  candidate: () =>
    load(
      process.env.VPM_REACT_VIRTUAL_ENTRY ||
        path.resolve(__dirname, "../../packages/vtanstack-react-virtual"),
    ),
};
