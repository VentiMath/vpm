"use strict";
const fs = require("node:fs"),
  vm = require("node:vm"),
  { createRequire } = require("node:module");
module.exports = (engine, cssjanus = require("cssjanus")) => {
  const file = require.resolve("stylis-plugin-rtl"),
    native = createRequire(file),
    module = { exports: {} };
  vm.runInThisContext(
    "(function(require,module,exports){" +
      fs.readFileSync(file, "utf8") +
      "\n})",
    { filename: file },
  )(
    (name) =>
      name === "stylis"
        ? engine
        : name === "cssjanus"
          ? cssjanus
          : native(name),
    module,
    module.exports,
  );
  return module.exports.default;
};
