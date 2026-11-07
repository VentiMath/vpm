import { Schema, type NodeSpec } from "vprosemirror-model";
import { EditorState, type Command } from "vprosemirror-state";
import {
  orderedList,
  bulletList,
  listItem,
  addListNodes,
  wrapInList,
  wrapRangeInList,
  splitListItem,
  splitListItemKeepMarks,
  sinkListItem,
  liftListItem,
} from "vprosemirror-schema-list";
const base = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "text*", group: "block" },
    text: {},
  },
});
const nodes = addListNodes(base.spec.nodes, "paragraph block*", "block");
const schema = new Schema<string>({ nodes }),
  state = EditorState.create({ schema });
const types = Object.freeze([schema.nodes.list_item]);
const commands: Command[] = [
  wrapInList(schema.nodes.ordered_list, { order: 5 }),
  splitListItem(types),
  splitListItemKeepMarks(types),
  sinkListItem(types),
  liftListItem(types),
];
commands.forEach((c) => c(state, (tr) => state.apply(tr)));
const range = state.selection.$from.blockRange(state.selection.$to);
if (range) wrapRangeInList(state.tr, range, schema.nodes.bullet_list);
const specs: NodeSpec[] = [orderedList, bulletList, listItem];
void specs;
// @ts-expect-error item type is a NodeType, not a string
splitListItem("list_item");
