import {
  EditorState,
  Plugin,
  PluginKey,
  TextSelection,
  NodeSelection,
  AllSelection,
  Selection,
  SelectionRange,
  Transaction,
  type Command,
  type StateField,
  type PluginView,
} from "vprosemirror-state";
import { Schema } from "vprosemirror-model";
import type { EditorView, EditorProps } from "prosemirror-view";
const key = new PluginKey<number>("count");
const field: StateField<number> = { init: () => 0, apply: (_tr, n) => n + 1 };
const plugin = new Plugin({
  key,
  state: field,
  props: {
    handleKeyDown(view, event) {
      const typed: EditorView = view;
      const e: KeyboardEvent = event;
      void [typed, e];
      return false;
    },
    handleDOMEvents: {
      click(view, event) {
        const e: MouseEvent = event;
        view.dispatch(view.state.tr);
        return false;
      },
    },
    attributes: (state) => ({ "data-length": String(state.doc.content.size) }),
  },
  view(view) {
    const pv: PluginView = {
      update(next, old) {
        next.dispatch(old.tr);
      },
      destroy() {},
    };
    return pv;
  },
});
const props: EditorProps<Plugin<number>> = plugin.props;
const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "text*" },
    text: {},
  },
});
const state = EditorState.create({ schema, plugins: [plugin] });
const transaction: Transaction = state.tr.insertText("hello");
const command: Command = (s, dispatch) => {
  dispatch?.(s.tr);
  return true;
};
const selected = TextSelection.create(state.doc, 1);
const bookmark = selected.getBookmark().map(transaction.mapping);
const anchor: number = bookmark.anchor;
const all: Selection = new AllSelection(state.doc);
const range = new SelectionRange(all.$from, all.$to);
const count: number | undefined = key.getState(state.apply(transaction));
void [props, command, anchor, range, count, NodeSelection];
// @ts-expect-error plugin state types are preserved
const wrong: string | undefined = key.getState(state);
new Plugin({
  props: {
    // @ts-expect-error keydown receives a keyboard event
    handleKeyDown(_view, event: PointerEvent) {
      return false;
    },
  },
});
