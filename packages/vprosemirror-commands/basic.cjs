"use strict";
const {
  Selection,
  TextSelection,
  NodeSelection,
  AllSelection,
} = require("vprosemirror-state");
const {
  canJoin,
  joinPoint,
  liftTarget,
  findWrapping,
  canSplit,
} = require("vprosemirror-transform");
function deliver(tr, dispatch, scroll = true) {
  if (dispatch) dispatch(scroll ? tr.scrollIntoView() : tr);
  return true;
}
function defaultTextblock(match) {
  for (let i = 0; i < match.edgeCount; i++) {
    const type = match.edge(i).type;
    if (type.isTextblock && !type.hasRequiredAttrs()) return type;
  }
  return null;
}
function deleteSelection(state, dispatch) {
  return (
    !state.selection.empty &&
    (dispatch ? deliver(state.tr.deleteSelection(), dispatch) : true)
  );
}
function selectAll(state, dispatch) {
  return deliver(
    state.tr.setSelection(new AllSelection(state.doc)),
    dispatch,
    false,
  );
}
function selectParentNode(state, dispatch) {
  const s = state.selection,
    depth = s.$from.sharedDepth(s.to);
  return (
    depth > 0 &&
    deliver(
      state.tr.setSelection(
        NodeSelection.create(state.doc, s.$from.before(depth)),
      ),
      dispatch,
    )
  );
}
function textEdge(dir) {
  return (state, dispatch) => {
    const pos = dir < 0 ? state.selection.$from : state.selection.$to;
    for (let d = pos.depth; d > 0; d--)
      if (pos.node(d).isTextblock)
        return deliver(
          state.tr.setSelection(
            TextSelection.create(
              state.doc,
              dir < 0 ? pos.start(d) : pos.end(d),
            ),
          ),
          dispatch,
        );
    return false;
  };
}
const selectTextblockStart = textEdge(-1),
  selectTextblockEnd = textEdge(1);
function joinSelected(dir) {
  return (state, dispatch) => {
    const s = state.selection,
      node = s instanceof NodeSelection;
    let pos;
    if (node) {
      if (s.node.isTextblock) return false;
      pos = dir < 0 ? s.from : s.to;
      if (!canJoin(state.doc, pos)) return false;
    } else {
      pos = joinPoint(state.doc, dir < 0 ? s.from : s.to, dir);
      if (pos === undefined) return false;
    }
    if (!dispatch) return true;
    const before = state.doc.resolve(pos).nodeBefore,
      tr = state.tr.join(pos);
    if (node && dir < 0)
      tr.setSelection(NodeSelection.create(tr.doc, pos - before.nodeSize));
    return deliver(tr, dispatch);
  };
}
const joinUp = joinSelected(-1),
  joinDown = joinSelected(1);
function lift(state, dispatch) {
  const range = state.selection.$from.blockRange(state.selection.$to),
    target = range && liftTarget(range);
  return (
    target != null &&
    (dispatch ? deliver(state.tr.lift(range, target), dispatch) : true)
  );
}
function wrapIn(type, attrs = null) {
  return (state, dispatch) => {
    const range = state.selection.$from.blockRange(state.selection.$to),
      wrappers = range && findWrapping(range, type, attrs);
    return (
      !!wrappers &&
      (dispatch ? deliver(state.tr.wrap(range, wrappers), dispatch) : true)
    );
  };
}
function setBlockType(type, attrs = null) {
  return (state, dispatch) => {
    let possible = false;
    for (const range of state.selection.ranges)
      state.doc.nodesBetween(
        range.$from.pos,
        range.$to.pos,
        (node, pos, parent, index) => {
          if (
            node.isTextblock &&
            !node.hasMarkup(type, attrs) &&
            (node.type === type ||
              parent.canReplaceWith(index, index + 1, type))
          )
            possible = true;
        },
      );
    if (!possible) return false;
    if (!dispatch) return true;
    const tr = state.tr;
    for (const range of state.selection.ranges)
      tr.setBlockType(
        tr.mapping.map(range.$from.pos),
        tr.mapping.map(range.$to.pos),
        type,
        attrs,
      );
    return deliver(tr, dispatch);
  };
}
function newlineInCode(state, dispatch) {
  const s = state.selection;
  return (
    !!s.$head.parent.type.spec.code &&
    s.$head.sameParent(s.$anchor) &&
    (dispatch ? deliver(state.tr.insertText("\n"), dispatch) : true)
  );
}
function exitCode(state, dispatch) {
  const s = state.selection,
    p = s.$head;
  if (!p.parent.type.spec.code || !p.sameParent(s.$anchor)) return false;
  const parent = p.node(-1),
    index = p.indexAfter(-1),
    type = defaultTextblock(parent.contentMatchAt(index));
  if (!type || !parent.canReplaceWith(index, index, type)) return false;
  if (!dispatch) return true;
  const pos = p.after(),
    tr = state.tr.insert(pos, type.createAndFill());
  return deliver(
    tr.setSelection(Selection.near(tr.doc.resolve(pos), 1)),
    dispatch,
  );
}
function createParagraphNear(state, dispatch) {
  const s = state.selection;
  if (
    s instanceof AllSelection ||
    s.$from.parent.inlineContent ||
    s.$to.parent.inlineContent
  )
    return false;
  const type = defaultTextblock(
    s.$to.parent.contentMatchAt(s.$to.indexAfter()),
  );
  if (!type) return false;
  const pos = s.from === 0 && s.to < state.doc.content.size ? s.from : s.to;
  if (!dispatch) return true;
  const tr = state.tr.insert(pos, type.createAndFill());
  return deliver(
    tr.setSelection(TextSelection.create(tr.doc, pos + 1)),
    dispatch,
  );
}
function liftEmptyBlock(state, dispatch) {
  const p = state.selection.$cursor;
  if (!p || p.parent.content.size) return false;
  if (p.depth > 1 && p.after() !== p.end(-1)) {
    const split = p.before();
    if (canSplit(state.doc, split))
      return dispatch ? deliver(state.tr.split(split), dispatch) : true;
  }
  return lift(state, dispatch);
}
function chainCommands(...commands) {
  return (state, dispatch, view) => {
    for (const command of commands)
      if (command(state, dispatch, view)) return true;
    return false;
  };
}
module.exports = {
  deliver,
  defaultTextblock,
  deleteSelection,
  selectAll,
  selectParentNode,
  selectTextblockStart,
  selectTextblockEnd,
  joinUp,
  joinDown,
  lift,
  wrapIn,
  setBlockType,
  newlineInCode,
  exitCode,
  createParagraphNear,
  liftEmptyBlock,
  chainCommands,
};
