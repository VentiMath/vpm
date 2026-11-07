const { Selection } = require("selection-contract");
const S = require("prosemirror-state"),
  M = require("prosemirror-model");
const schema = new M.Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "text*" },
    text: {},
  },
});
const doc = schema.node("doc", null, [
  schema.node("paragraph", null, schema.text("selected text")),
  schema.node("paragraph", null, schema.text("next")),
]);
const results = [];
for (const kind of ["text", "empty", "node"])
  for (const isFocused of [false, true])
    for (const isEditable of [false, true]) {
      const editor = { isFocused, isEditable },
        plugin = Selection.config.addProseMirrorPlugins.call({ editor })[0];
      const selection =
        kind === "node"
          ? S.NodeSelection.create(doc, 0)
          : S.TextSelection.create(doc, 2, kind === "empty" ? 2 : 8);
      const state = S.EditorState.create({ doc, selection, plugins: [plugin] });
      const value = plugin.props.decorations.call(plugin, state);
      const record =
        value
          ?.find()
          .map((d) => ({ from: d.from, to: d.to, attrs: d.type.attrs })) ||
        null;
      if (kind === "text" && !isFocused && isEditable) {
        if (
          JSON.stringify(record) !==
          JSON.stringify([{ from: 2, to: 8, attrs: { class: "selection" } }])
        )
          throw Error("Missing unfocused editable selection");
      } else if (record !== null)
        throw Error("Unexpected selection decoration");
      results.push({ kind, isFocused, isEditable, decorations: record });
    }
module.exports = results;
