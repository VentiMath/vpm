const {
  Extension,
} = require("../prosemirror-model-conformance/node_modules/@tiptap/core");
("use strict");
const {
  Editor,
} = require("../prosemirror-model-conformance/node_modules/@tiptap/core");
const StarterKit =
  require("../prosemirror-model-conformance/node_modules/@tiptap/starter-kit").default;
const { keyName, base, shift } = require("w3c-keyname");
const { keymap } = require("prosemirror-keymap");
module.exports = function setup(name) {
  let calls = [];
  const extra = Extension.create({
    name: "keymapContracts",
    addProseMirrorPlugins() {
      return [
        keymap({
          Escape: () => {
            calls.push("first");
            return false;
          },
        }),
        keymap({
          Escape: () => {
            calls.push("second");
            return true;
          },
          "Alt-x": () => {
            calls.push("alt");
            return true;
          },
        }),
      ];
    },
  });
  const host = document.createElement("div");
  host.dataset.variant = name;
  document.body.append(host);
  const editor = new Editor({
    element: host,
    extensions: [StarterKit, extra],
    content: "<p>alpha beta</p>",
  });
  let events = [];
  editor.view.dom.addEventListener("keydown", (event) =>
    events.push({
      key: keyName(event),
      trusted: event.isTrusted,
      prevented: event.defaultPrevented,
    }),
  );
  const inputs = [
    { key: "λ", keyCode: 76 },
    { key: "Esc", keyCode: 27 },
    { key: "Unidentified", keyCode: 13 },
    { key: "a", keyCode: 65, shiftKey: true, metaKey: true },
    { key: "é", keyCode: 69, ctrlKey: true, altKey: true },
    { key: "Dead", keyCode: 229 },
    { key: "Process", keyCode: 229 },
    { key: "Left", keyCode: 37 },
    { key: " ", keyCode: 32 },
    { key: "?", keyCode: 191, shiftKey: true },
    { key: "🎵", keyCode: 0 },
    { keyCode: 255 },
  ];
  return {
    names: inputs.map((options) =>
      keyName(new KeyboardEvent("keydown", options)),
    ),
    tables: [base[65], shift[65], base[13]],
    reset() {
      editor.commands.setContent("<p>alpha beta</p>");
      editor.commands.setTextSelection(6);
      editor.view.focus();
      events = [];
      calls = [];
    },
    snapshot() {
      return {
        doc: editor.getJSON(),
        selection: editor.state.selection.toJSON(),
        marks: editor.state.storedMarks?.map((m) => m.type.name) || [],
        events,
        calls,
      };
    },
  };
};
