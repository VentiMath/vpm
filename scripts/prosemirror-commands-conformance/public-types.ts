import { EditorState, TextSelection, type Command } from "vprosemirror-state";
import { Schema } from "vprosemirror-model";
import {
  splitBlockAs,
  splitBlockKeepMarks,
  joinBackward,
  joinForward,
  selectAll,
  toggleMark,
  autoJoin,
  chainCommands,
  wrapIn,
  setBlockType,
  pcBaseKeymap,
} from "vprosemirror-commands";
const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "text*" },
    text: {},
  },
  marks: { em: {} },
});
let state = EditorState.create({ schema });
const command: Command = chainCommands(
  joinBackward,
  joinForward,
  splitBlockKeepMarks,
  selectAll,
);
command(state, (transaction) => {
  state = state.apply(transaction);
});
splitBlockAs((node, atEnd, from) =>
  atEnd && from.depth
    ? { type: schema.nodes.paragraph, attrs: node.attrs }
    : null,
);
toggleMark(schema.marks.em, null, {
  includeWhitespace: true,
  enterInlineAtoms: false,
  removeWhenPresent: false,
})(state);
wrapIn(schema.nodes.paragraph)(state);
setBlockType(schema.nodes.paragraph)(state);
autoJoin(command, (a, b) => a.type === b.type)(state);
autoJoin(command, ["paragraph"] as const)(state);
pcBaseKeymap.Enter(state);
state.tr.setSelection(TextSelection.create(state.doc, 1));
// @ts-expect-error a mark type is not a block type
setBlockType(schema.marks.em);
// @ts-expect-error split callbacks must return a node type
splitBlockAs(() => ({ type: "paragraph" }));
// @ts-expect-error command options are boolean
toggleMark(schema.marks.em, null, { includeWhitespace: "yes" });
