import { Schema } from "vprosemirror-model";
import { keymap, keydownHandler, type KeyBindings } from "vprosemirror-keymap";
import { EditorState, type Command, Plugin } from "vprosemirror-state";
const command: Command = (state, dispatch, view) => {
  if (view) state = view.state;
  if (dispatch) dispatch(state.tr.insertText("x"));
  return true;
};
const bindings: KeyBindings = { "Mod-b": command, Enter: command };
const plugin: Plugin = keymap(bindings);
const state = EditorState.create({
  schema: new Schema({
    nodes: {
      doc: { content: "paragraph+" },
      paragraph: { content: "text*" },
      text: {},
    },
  }),
  plugins: [plugin],
});
const handler = keydownHandler(bindings);
const typedHandler: NonNullable<typeof plugin.props.handleKeyDown> = handler;
// @ts-expect-error key handlers must be commands
keymap({ Enter: "insert" });
// @ts-expect-error command result must be boolean
keydownHandler({ Enter: () => 1 });
