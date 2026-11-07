"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/keyname-conformance"),
  upstream = path.join(fixture, "node_modules/w3c-keyname"),
  { load } = require(path.join(fixture, "load.cjs"));
function rotate(file, events) {
  const { keyName } = require(file);
  let index = 0;
  return () => keyName(events[index++ % events.length]);
}
const cases = [
  {
    name: "modern letter keys",
    make: (file) =>
      rotate(
        file,
        Array.from("aAzZbBcCdD", (key) => ({
          key,
          keyCode: key.toUpperCase().charCodeAt(0),
        })),
      ),
    validate: (x) => assert.equal(typeof x, "string"),
  },
  {
    name: "modern navigation keys",
    make: (file) =>
      rotate(
        file,
        ["ArrowLeft", "ArrowRight", "Enter", "Backspace", "Tab", "Escape"].map(
          (key) => ({ key, keyCode: 0 }),
        ),
      ),
    validate: (x) =>
      assert(
        [
          "ArrowLeft",
          "ArrowRight",
          "Enter",
          "Backspace",
          "Tab",
          "Escape",
        ].includes(x),
      ),
  },
  {
    name: "international and composition keys",
    make: (file) =>
      rotate(
        file,
        ["é", "λ", "中", "🎵", "Dead", "Process", "AltGraph"].map((key) => ({
          key,
          keyCode: 229,
        })),
      ),
    validate: (x) =>
      assert(["é", "λ", "中", "🎵", "Dead", "Process", "AltGraph"].includes(x)),
  },
  {
    name: "legacy key-code and shift fallback",
    make: (file) =>
      rotate(
        file,
        [65, 48, 13, 37, 191, 112, 96, 222].flatMap((keyCode) =>
          [false, true].map((shiftKey) => ({ keyCode, shiftKey })),
        ),
      ),
    validate: (x) => assert.equal(typeof x, "string"),
  },
  {
    name: "getter-backed keyboard events",
    make: (file) =>
      rotate(
        file,
        ["a", "Enter", "é", "Esc", "Dead"].map((value) =>
          Object.assign(
            Object.create({
              get key() {
                return this.value;
              },
            }),
            { value, keyCode: 0 },
          ),
        ),
      ),
    validate: (x) => assert(["a", "Enter", "é", "Escape", "Dead"].includes(x)),
  },
  {
    name: "Mac Command+Shift fallback",
    make(file) {
      const { names } = load(path.join(file, "index.cjs"), {
          platform: "MacIntel",
          userAgent: "Safari",
        }),
        events = ["a", "z", "b", "c"].map((key) => ({
          key,
          keyCode: key.toUpperCase().charCodeAt(0),
          shiftKey: true,
          metaKey: true,
        }));
      let i = 0;
      return () => names.keyName(events[i++ % events.length]);
    },
    validate: (x) => assert(["A", "Z", "B", "C"].includes(x)),
  },
  {
    name: "unidentified unmapped keys",
    make: (file) =>
      rotate(
        file,
        [0, 255, 256, 65535].map((keyCode) => ({
          key: "Unidentified",
          keyCode,
        })),
      ),
    validate: (x) => assert.equal(x, "Unidentified"),
  },
  {
    name: "ProseMirror keymap shortcut dispatch",
    make(file) {
      const { keymap } = load(path.join(file, "index.cjs"), {
          platform: "Win32",
          userAgent: "Chrome",
        }),
        handler = keymap.keydownHandler({
          "Mod-b": () => true,
          Enter: () => true,
          "Shift-Tab": () => true,
        }),
        view = { state: {}, dispatch() {} },
        events = [
          { key: "b", keyCode: 66, ctrlKey: true },
          { key: "Enter", keyCode: 13 },
          { key: "Tab", keyCode: 9, shiftKey: true },
        ];
      let i = 0;
      return () => handler(view, events[i++ % events.length]);
    },
    validate: (x) => assert.equal(x, true),
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
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../../scripts/keyname-conformance/load.cjs",
      "../../scripts/keyname-conformance/package-lock.json",
      ...[
        "w3c-keyname",
        "prosemirror-keymap",
        "prosemirror-state",
        "prosemirror-model",
        "prosemirror-transform",
      ].map((x) => "../../scripts/keyname-conformance/node_modules/" + x),
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
