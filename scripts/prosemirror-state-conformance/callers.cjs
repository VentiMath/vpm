"use strict";
const base = require("../prosemirror-model-conformance/callers.cjs");
const {
  Editor,
  Extension,
  getMarkRange,
} = require("../prosemirror-model-conformance/node_modules/@tiptap/core");
const StarterKit =
  require("../prosemirror-model-conformance/node_modules/@tiptap/starter-kit").default;
const Link =
  require("../prosemirror-model-conformance/node_modules/@tiptap/extension-link").default;
const {
  Plugin,
  PluginKey,
  TextSelection,
  NodeSelection,
} = require("prosemirror-state");
const { Decoration, DecorationSet } = require("prosemirror-view");
function assert(value, message) {
  if (!value) throw Error(message);
}
module.exports = function exercise(document) {
  const snapshots = base(document),
    key = new PluginKey("appTrailing"),
    lifecycle = { created: 0, updated: 0, destroyed: 0 };
  let trailing, selectionPlugin, linkPlugin;
  const app = Extension.create({
    name: "appStateContracts",
    addProseMirrorPlugins() {
      const editor = this.editor;
      trailing = new Plugin({
        key,
        state: {
          init(_config, s) {
            return s.doc.lastChild?.type.name !== "paragraph";
          },
          apply(tr, value) {
            return tr.docChanged
              ? tr.doc.lastChild?.type.name !== "paragraph"
              : value;
          },
        },
        appendTransaction(_trs, _old, s) {
          return key.getState(s)
            ? s.tr.insert(s.doc.content.size, s.schema.nodes.paragraph.create())
            : null;
        },
        view() {
          lifecycle.created++;
          return {
            update() {
              lifecycle.updated++;
            },
            destroy() {
              lifecycle.destroyed++;
            },
          };
        },
      });
      selectionPlugin = new Plugin({
        props: {
          decorations(s) {
            return s.selection.empty ||
              editor.isFocused ||
              s.selection instanceof NodeSelection
              ? null
              : DecorationSet.create(s.doc, [
                  Decoration.inline(s.selection.from, s.selection.to, {
                    class: "selection",
                  }),
                ]);
          },
        },
      });
      linkPlugin = new Plugin({
        props: {
          handleClick(view, pos) {
            const range = getMarkRange(
              view.state.doc.resolve(pos),
              view.state.schema.marks.link,
            );
            if (range)
              view.dispatch(
                view.state.tr.setSelection(
                  TextSelection.create(view.state.doc, range.from, range.to),
                ),
              );
          },
        },
      });
      return [trailing, selectionPlugin, linkPlugin];
    },
  });
  const element = document.createElement("div");
  document.body.append(element);
  const editor = new Editor({
    element,
    extensions: [
      StarterKit,
      Link.configure({ inclusive: false, openOnClick: false }),
      app,
    ],
    content: '<p>a <a href="https://ventimath.org">linked</a> value</p>',
  });
  const result = {};
  linkPlugin.props.handleClick(
    editor.view,
    4,
    new document.defaultView.MouseEvent("click"),
  );
  assert(
    editor.state.selection.from === 3 && editor.state.selection.to === 9,
    "link click selects the mark range",
  );
  result.link = editor.state.selection.toJSON();
  const decorations = selectionPlugin.props.decorations(editor.state);
  assert(decorations.find().length === 1, "blurred text range is decorated");
  result.decorations = decorations.find().map((d) => [d.from, d.to]);
  editor.commands.setContent("<h1>heading</h1>");
  editor.commands.insertContent("!");
  assert(
    editor.state.doc.lastChild.type.name === "paragraph",
    "trailing state plugin appends paragraph",
  );
  assert(key.getState(editor.state) === false, "trailing field settles");
  result.trailing = editor.getJSON();
  const old = editor.state;
  editor.view.updateState(
    old.reconfigure({ plugins: old.plugins.filter((p) => p !== trailing) }),
  );
  assert(
    lifecycle.created === 1 &&
      lifecycle.updated > 0 &&
      lifecycle.destroyed === 1,
    "view lifecycle follows state reconfiguration",
  );
  result.lifecycle = {
    created: lifecycle.created,
    destroyed: lifecycle.destroyed,
    updated: lifecycle.updated > 0,
  };
  editor.destroy();
  element.remove();
  snapshots[snapshots.length - 1].appState = result;
  return snapshots;
};
