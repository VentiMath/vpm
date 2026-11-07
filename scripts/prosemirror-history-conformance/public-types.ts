import { Schema } from "vprosemirror-model";
import { EditorState, type Command } from "vprosemirror-state";
import {
  history,
  closeHistory,
  undo,
  redo,
  undoNoScroll,
  redoNoScroll,
  undoDepth,
  redoDepth,
  isHistoryTransaction,
  type HistoryOptions,
} from "vprosemirror-history";
const options: HistoryOptions = { depth: 100, newGroupDelay: 500 };
const schema = new Schema({ nodes: { doc: { content: "text*" }, text: {} } });
const state = EditorState.create({ schema, plugins: [history(options)] });
const command: Command = undo;
const n: number = undoDepth(state) + redoDepth(state);
const flag: boolean = isHistoryTransaction(closeHistory(state.tr));
[command, redo, undoNoScroll, redoNoScroll].forEach((c) =>
  c(state, (tr) => state.apply(tr)),
);
// @ts-expect-error delay is numeric
history({ newGroupDelay: "500" });
void [n, flag];
