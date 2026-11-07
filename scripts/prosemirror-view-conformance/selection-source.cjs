// Independently expressed contract of VentiMath's documentation editor Selection
// extension. build.cjs can substitute the actual application file for read-only
// local verification; the public fixture contains no application source.
const { Plugin, PluginKey, NodeSelection } = require("prosemirror-state");
exports.Selection = {
  config: {
    addProseMirrorPlugins() {
      const { editor } = this;
      return [
        new Plugin({
          key: new PluginKey("selection"),
          props: {
            decorations(state) {
              const selected = state.selection;
              if (
                selected.empty ||
                editor.isFocused === true ||
                !editor.isEditable ||
                selected instanceof NodeSelection
              )
                return null;
              const { Decoration, DecorationSet } = require("prosemirror-view");
              return DecorationSet.create(state.doc, [
                Decoration.inline(selected.from, selected.to, {
                  class: "selection",
                }),
              ]);
            },
          },
        }),
      ];
    },
  },
};
