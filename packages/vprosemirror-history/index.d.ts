import type {
  Transaction,
  Plugin,
  Command,
  EditorState,
} from "vprosemirror-state" with { "resolution-mode": "require" };
export interface HistoryOptions {
  depth?: number;
  newGroupDelay?: number;
}
export declare function history(config?: HistoryOptions): Plugin;
export declare function closeHistory(tr: Transaction): Transaction;
export declare const undo: Command,
  redo: Command,
  undoNoScroll: Command,
  redoNoScroll: Command;
export declare function undoDepth(state: EditorState): number;
export declare function redoDepth(state: EditorState): number;
export declare function isHistoryTransaction(tr: Transaction): boolean;
