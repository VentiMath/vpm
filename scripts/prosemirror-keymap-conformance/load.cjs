"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
const root = path.resolve(__dirname, "../..");
function moduleAt(file, navigator, resolve) {
  const exports = {},
    module = { exports },
    context = {};
  if (navigator) context.navigator = navigator;
  const factory = vm.runInNewContext(
    "(function(exports,require,module,__filename,__dirname){\n" +
      fs.readFileSync(file, "utf8") +
      "\n})",
    context,
    { filename: file },
  );
  factory(exports, resolve, module, file, path.dirname(file));
  return module.exports;
}
function local(name, env) {
  return process.env[env] || path.join(root, "packages", name, "index.cjs");
}
function load(variant, navigator) {
  const vpm = variant === "vpm",
    names = moduleAt(
      vpm
        ? local("vw3c-keyname", "VPM_KEYNAME_ENTRY")
        : require.resolve("w3c-keyname"),
      navigator,
    ),
    state = require(
      vpm
        ? local("vprosemirror-state", "VPM_STATE_ENTRY")
        : "prosemirror-state",
    ),
    model = require(
      vpm
        ? local("vprosemirror-model", "VPM_MODEL_ENTRY")
        : "prosemirror-model",
    );
  const keymap = moduleAt(
    vpm
      ? local("vprosemirror-keymap", "VPM_KEYMAP_ENTRY")
      : require.resolve("prosemirror-keymap"),
    navigator,
    (name) =>
      /w3c-keyname$/.test(name)
        ? names
        : /prosemirror-state$/.test(name)
          ? state
          : require(name),
  );
  return { keymap, state, model };
}
module.exports = { load };
