"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/prosemirror-keymap-conformance"),
  upstream = path.join(fixture, "node_modules/prosemirror-keymap"),
  { load } = require(path.join(fixture, "load.cjs"));
const handled = () => true,
  view = { state: {}, dispatch() {} },
  enter = { key: "Enter", keyCode: 13 };
const small = {
  Enter: handled,
  Escape: handled,
  Tab: handled,
  "Shift-Tab": handled,
  "Mod-b": handled,
  "Mod-i": handled,
  "Alt-x": handled,
  "Ctrl-Space": handled,
};
const large = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) =>
    ["", "Ctrl-", "Shift-", "Ctrl-Shift-"].map((prefix) => [
      prefix + "F" + (i + 1),
      handled,
    ]),
  ).flat(),
);
function api(file, platform = "Linux") {
  return load(file === root ? "vpm" : "upstream", {
    platform,
    userAgent: "Chrome",
  }).keymap;
}
function dispatch(file, bindings, events, platform) {
  const handler = api(file, platform).keydownHandler(bindings);
  let i = 0;
  return () => handler(view, events[i++ % events.length]);
}
const cases = [
  {
    name: "compile eight shortcut bindings",
    make: (file) => {
      const k = api(file);
      return () => k.keydownHandler(small);
    },
    validate: (handler) => assert.equal(handler(view, enter), true),
  },
  {
    name: "compile 48 function-key bindings",
    make: (file) => {
      const k = api(file);
      return () => k.keydownHandler(large);
    },
    validate: (handler) =>
      assert.equal(
        handler(view, { key: "F12", ctrlKey: true, shiftKey: true }),
        true,
      ),
  },
  {
    name: "create an eight-binding plugin",
    make: (file) => {
      const k = api(file);
      return () => k.keymap(small);
    },
    validate: (plugin) =>
      assert.equal(plugin.props.handleKeyDown(view, enter), true),
  },
  {
    name: "dispatch unmodified keys",
    make: (file) =>
      dispatch(file, small, [
        enter,
        { key: "Escape", keyCode: 27 },
        { key: "Tab", keyCode: 9 },
      ]),
    validate: (x) => assert.equal(x, true),
  },
  {
    name: "dispatch modifier shortcuts",
    make: (file) =>
      dispatch(file, small, [
        { key: "b", keyCode: 66, ctrlKey: true },
        { key: "i", keyCode: 73, ctrlKey: true },
        { key: " ", keyCode: 32, ctrlKey: true },
        { key: "Tab", keyCode: 9, shiftKey: true },
      ]),
    validate: (x) => assert.equal(x, true),
  },
  {
    name: "dispatch shifted literal characters",
    make: (file) =>
      dispatch(file, { "%": handled, "Ctrl-?": handled }, [
        { key: "%", keyCode: 53, shiftKey: true },
        { key: "?", keyCode: 191, shiftKey: true, ctrlKey: true },
      ]),
    validate: (x) => assert.equal(x, true),
  },
  {
    name: "dispatch non-US modifier fallback",
    make: (file) =>
      dispatch(file, { "Alt-x": handled, "Mod-s": handled }, [
        { key: "≈", keyCode: 88, altKey: true },
        { key: "ы", keyCode: 83, ctrlKey: true },
      ]),
    validate: (x) => assert.equal(x, true),
  },
  {
    name: "leave Windows AltGraph input unhandled",
    make: (file) =>
      dispatch(
        file,
        { "Ctrl-Alt-e": handled },
        [{ key: "é", keyCode: 69, ctrlKey: true, altKey: true }],
        "Win32",
      ),
    validate: (x) => assert.equal(x, false),
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream,
    vpm: root,
    cases,
    files: [
      "index.cjs",
      "index.mjs",
      "index.d.ts",
      "index.d.mts",
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../../scripts/prosemirror-keymap-conformance/load.cjs",
      "../../scripts/prosemirror-keymap-conformance/package-lock.json",
      ...[
        "vprosemirror-state",
        "vprosemirror-model",
        "vprosemirror-transform",
        "vorderedmap",
        "vw3c-keyname",
      ].flatMap((n) =>
        fs
          .readdirSync(path.join(root, "..", n))
          .filter((f) => f.endsWith(".cjs"))
          .map((f) => "../" + n + "/" + f),
      ),
      ...[
        "prosemirror-keymap",
        "prosemirror-state",
        "prosemirror-model",
        "prosemirror-transform",
        "w3c-keyname",
      ].map(
        (n) => "../../scripts/prosemirror-keymap-conformance/node_modules/" + n,
      ),
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
