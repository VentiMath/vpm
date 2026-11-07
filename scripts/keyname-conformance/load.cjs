"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
const upstream = path.join(__dirname, "node_modules/w3c-keyname/index.cjs");
const vpm =
  process.env.VPM_KEYNAME_ENTRY ||
  path.resolve(__dirname, "../../packages/vw3c-keyname/index.cjs");
function moduleAt(file, navigator, resolve) {
  const exports = {},
    module = { exports },
    context = {};
  if (navigator) context.navigator = navigator;
  // CommonJS top-level var bindings are module-local, not properties on the
  // VM's global proxy. Preserve that scope for fair caller measurements.
  const factory = vm.runInNewContext(
    "(function(exports, require, module, __filename, __dirname) {\n" +
      fs.readFileSync(file, "utf8") +
      "\n})",
    context,
    { filename: file },
  );
  factory(exports, resolve, module, file, path.dirname(file));
  return module.exports;
}
function load(file, navigator) {
  const names = moduleAt(file, navigator);
  const keymap = moduleAt(
    require.resolve("prosemirror-keymap"),
    navigator,
    (name) => (name === "w3c-keyname" ? names : require(name)),
  );
  return { names, keymap };
}
module.exports = { load, upstream, vpm };
