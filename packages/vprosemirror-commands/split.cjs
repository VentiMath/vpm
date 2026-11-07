"use strict";
const { NodeSelection, TextSelection } = require("vprosemirror-state");
const { canSplit } = require("vprosemirror-transform");
const { defaultTextblock, deliver } = require("./basic.cjs");
function splitBlockAs(choose) {
  return (state, dispatch) => {
    const selection = state.selection;
    if (selection instanceof NodeSelection && selection.node.isBlock) {
      const pos = selection.from;
      if (!selection.$from.parentOffset || !canSplit(state.doc, pos))
        return false;
      return dispatch ? deliver(state.tr.split(pos), dispatch) : true;
    }
    const tr = state.tr;
    // A plain cursor has nothing to delete. The split resets stored marks,
    // so resolving an empty replacement first adds no observable edit.
    if (!selection.empty || selection.constructor !== TextSelection)
      tr.deleteSelection();
    const cursor = tr.selection.$from;
    let depth = cursor.depth;
    while (depth > 0 && !cursor.node(depth).isBlock) depth--;
    if (!depth) return false;
    const node = cursor.node(depth);
    if (!node.isTextblock) return false;
    const outer = cursor.node(depth - 1),
      index = cursor.index(depth - 1),
      defaultType = defaultTextblock(outer.contentMatchAt(index + 1)),
      atEnd = cursor.pos === cursor.end(depth),
      atStart = cursor.pos === cursor.start(depth),
      splitDepth = cursor.depth - depth + 1;
    const chosen = choose?.(node, atEnd, selection.$from),
      tail = [];
    for (let d = depth + 1; d <= cursor.depth; d++)
      tail.push({ type: cursor.node(d).type, attrs: cursor.node(d).attrs });
    let types = [
      chosen || (atEnd && defaultType ? { type: defaultType } : null),
      ...tail,
    ];
    if (!canSplit(tr.doc, cursor.pos, splitDepth, types)) {
      if (!defaultType) return false;
      types = [{ type: defaultType }, ...tail];
      if (!canSplit(tr.doc, cursor.pos, splitDepth, types)) return false;
    }
    if (!dispatch) return true;
    tr.split(cursor.pos, splitDepth, types);
    if (
      atStart &&
      !atEnd &&
      defaultType &&
      node.type !== defaultType &&
      outer.canReplaceWith(index, index + 1, defaultType)
    )
      tr.setNodeMarkup(cursor.before(depth), defaultType);
    return deliver(tr, dispatch);
  };
}
const splitBlock = splitBlockAs();
function splitBlockKeepMarks(state, dispatch) {
  return splitBlock(
    state,
    dispatch &&
      ((tr) => {
        const marks =
          state.storedMarks ||
          (state.selection.$to.parentOffset && state.selection.$from.marks());
        if (marks) tr.ensureMarks(marks);
        dispatch(tr);
      }),
  );
}
module.exports = { splitBlockAs, splitBlock, splitBlockKeepMarks };
