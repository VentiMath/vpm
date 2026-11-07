"use strict";
const assert = require("node:assert/strict"),
  { load, upstream, vpm } = require("./load.cjs");
const { Schema } = require("prosemirror-model"),
  { EditorState } = require("prosemirror-state");
const bindings = [
  "Mod-b",
  "Mod-B",
  "Shift-Mod-B",
  "Mod-Alt-0",
  "Ctrl-Space",
  "Enter",
  "Shift-Enter",
  "Backspace",
  "Delete",
  "Escape",
  "ArrowLeft",
  "Alt-x",
  "Ctrl-]",
  "Ctrl-Shift-/",
  "Shift-Tab",
  "a",
  "Shift-A",
  "Mod-z",
  "Mod-Shift-z",
  "Ctrl-Alt-e",
];
const events = [
  { key: "b", keyCode: 66, ctrlKey: true },
  { key: "b", keyCode: 66, metaKey: true },
  { key: "b", keyCode: 66, metaKey: true, shiftKey: true },
  { key: "0", keyCode: 48, metaKey: true, altKey: true },
  { key: " ", keyCode: 32, ctrlKey: true },
  { key: "Enter", keyCode: 13 },
  { key: "Enter", keyCode: 13, shiftKey: true },
  { key: "Unidentified", keyCode: 8 },
  { key: "Del", keyCode: 46 },
  { key: "Esc", keyCode: 27 },
  { key: "Left", keyCode: 37 },
  { key: "≈", keyCode: 88, altKey: true },
  { key: "]", keyCode: 221, ctrlKey: true },
  { key: "?", keyCode: 191, ctrlKey: true, shiftKey: true },
  { key: "Tab", keyCode: 9, shiftKey: true },
  { key: "a", keyCode: 65 },
  { key: "A", keyCode: 65, shiftKey: true },
  { key: "z", keyCode: 90, ctrlKey: true },
  { key: "z", keyCode: 90, metaKey: true, shiftKey: true },
  { key: "é", keyCode: 69, ctrlKey: true, altKey: true },
  { key: "Dead", keyCode: 69 },
  { key: "Process", keyCode: 229 },
  { key: "Unidentified", keyCode: 255 },
];
function exercise(file, navigator) {
  const { keymap } = load(file, navigator),
    schema = new Schema({
      nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "text*" },
        text: {},
      },
    });
  return events.map((event) => {
    const trace = [],
      commands = Object.fromEntries(
        bindings.map((name) => [
          name,
          (state, dispatch, view) => {
            assert.equal(state, view.state);
            trace.push(name);
            dispatch(state.tr.insertText("x"));
            return true;
          },
        ]),
      ),
      plugin = keymap.keymap(commands);
    let state = EditorState.create({ schema, plugins: [plugin] });
    const view = {
      get state() {
        return state;
      },
      dispatch(tr) {
        state = state.apply(tr);
      },
    };
    const handled = plugin.props.handleKeyDown(view, event);
    return { handled, trace, doc: state.doc.toJSON() };
  });
}
const configurations = [
  { platform: "Linux", userAgent: "Chrome" },
  { platform: "Win32", userAgent: "Chrome" },
  { platform: "MacIntel", userAgent: "Safari" },
  { platform: "iPad", userAgent: "Safari" },
  { platform: "Win32", userAgent: "MSIE 10.0" },
  { platform: "Win32", userAgent: "Trident/7.0; rv:11.0" },
];
for (const config of configurations)
  assert.deepEqual(exercise(vpm, config), exercise(upstream, config));
console.log(
  "138 real prosemirror-keymap plugin dispatch cases match across six platforms.",
);
