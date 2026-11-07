import api from "./index.cjs";
export const {
  history,
  closeHistory,
  undo,
  redo,
  undoNoScroll,
  redoNoScroll,
  undoDepth,
  redoDepth,
  isHistoryTransaction,
} = api;
