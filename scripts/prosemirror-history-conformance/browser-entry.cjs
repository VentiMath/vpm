"use strict";
const {
  Editor,
  Extension,
} = require("../prosemirror-model-conformance/node_modules/@tiptap/core");
const StarterKit =
  require("../prosemirror-model-conformance/node_modules/@tiptap/starter-kit").default;
const H = require("prosemirror-history"),
  { Plugin } = require("prosemirror-state");
const extra = Extension.create({
  name: "historyAppendCheck",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(trs, _old, state) {
          const suffix = trs[0].getMeta("historySuffix");
          if (suffix)
            return state.tr.insertText(suffix, state.doc.content.size - 1);
        },
      }),
    ];
  },
});
function create(depth = 100) {
  const host = document.createElement("div");
  document.body.append(host);
  return new Editor({
    element: host,
    extensions: [
      StarterKit.configure({ history: { depth, newGroupDelay: 60000 } }),
      extra,
    ],
    content: "<p>alpha</p>",
  });
}
module.exports = function setup(name) {
  const editor = create(),
    events = [];
  editor.view.dom.dataset.variant = name;
  editor.view.dom.addEventListener("keydown", (e) =>
    events.push({
      key: e.key,
      trusted: e.isTrusted,
      prevented: e.defaultPrevented,
    }),
  );
  const snapshot = () => ({
    doc: editor.getJSON(),
    text: editor.state.doc.textContent,
    selection: editor.state.selection.toJSON(),
    undo: H.undoDepth(editor.state),
    redo: H.redoDepth(editor.state),
    events: events.slice(),
  });
  return {
    prepare() {
      editor.commands.setTextSelection(6);
      editor.view.dispatch(H.closeHistory(editor.state.tr));
      editor.view.focus();
      events.length = 0;
    },
    snapshot,
    remote() {
      editor.view.dispatch(
        editor.state.tr.insertText("remote ", 1).setMeta("addToHistory", false),
      );
    },
    exercise() {
      const e = create(2),
        out = [];
      const record = () =>
        out.push([
          e.getJSON(),
          e.state.selection.toJSON(),
          H.undoDepth(e.state),
          H.redoDepth(e.state),
        ]);
      try {
        e.commands.setTextSelection(6);
        e.commands.insertContent("A");
        e.commands.insertContent("B");
        if (H.undoDepth(e.state) !== 1) throw Error("Typing was not grouped");
        record();
        e.commands.undo();
        record();
        if (e.state.doc.textContent !== "alpha") throw Error("Grouped undo");
        e.commands.redo();
        record();
        e.view.dispatch(H.closeHistory(e.state.tr));
        e.commands.splitBlock();
        record();
        e.commands.undo();
        record();
        e.commands.redo();
        record();
        e.view.dispatch(
          e.state.tr.insertText("R", 1).setMeta("addToHistory", false),
        );
        e.commands.undo();
        record();
        e.commands.insertContent("C");
        if (H.redoDepth(e.state) !== 0) throw Error("Redo invalidation");
        record();
        e.view.dispatch(
          H.closeHistory(
            e.state.tr.insertText("?").setMeta("historySuffix", "!"),
          ),
        );
        record();
        e.commands.undo();
        record();
        for (let i = 0; i < 40; i++)
          e.view.dispatch(H.closeHistory(e.state.tr.insertText("x", 1)));
        record();
        if (H.undoDepth(e.state) > 22) throw Error("Unbounded depth");
        const undoEvent = new InputEvent("beforeinput", {
          inputType: "historyUndo",
          bubbles: true,
          cancelable: true,
        });
        e.view.dom.dispatchEvent(undoEvent);
        if (!undoEvent.defaultPrevented)
          throw Error("Undo beforeinput not handled");
        record();
        e.setEditable(false);
        const redoEvent = new InputEvent("beforeinput", {
          inputType: "historyRedo",
          bubbles: true,
          cancelable: true,
        });
        e.view.dom.dispatchEvent(redoEvent);
        if (redoEvent.defaultPrevented)
          throw Error("Read-only history intercepted");
        record();
        return out;
      } finally {
        const host = e.options.element;
        e.destroy();
        host.remove();
      }
    },
  };
};
