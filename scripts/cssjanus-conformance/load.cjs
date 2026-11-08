"use strict";
const fs = require("node:fs"),
  vm = require("node:vm"),
  { createRequire } = require("node:module");
module.exports = (entry, stylis = require("stylis")) => {
  const file = require.resolve("stylis-plugin-rtl"),
    native = createRequire(file),
    module = { exports: {} };
  const load = (name) =>
    name === "cssjanus"
      ? require(entry)
      : name === "stylis"
        ? stylis
        : native(name);
  vm.runInThisContext(
    "(function(require,module,exports){" +
      fs.readFileSync(file, "utf8") +
      "\n})",
    { filename: file },
  )(load, module, module.exports);
  // The same middleware order and layer mutation used by RootThemeProvider.
  const layer = (node) => {
    if (node.root) return;
    const child = { ...node, parent: node, root: node };
    Object.assign(node, {
      children: [child],
      length: 6,
      parent: null,
      props: ["mui"],
      return: "",
      root: null,
      type: "@layer",
      value: "@layer mui",
    });
  };
  return (css, rtl = true) =>
    stylis.serialize(
      stylis.compile(css),
      stylis.middleware([
        ...(rtl ? [module.exports.default] : []),
        layer,
        stylis.stringify,
      ]),
    );
};
