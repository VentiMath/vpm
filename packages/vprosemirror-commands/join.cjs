"use strict";
const { Fragment, Slice } = require("vprosemirror-model");
const {
  Selection,
  TextSelection,
  NodeSelection,
} = require("vprosemirror-state");
const {
  canJoin,
  liftTarget,
  ReplaceAroundStep,
} = require("vprosemirror-transform");
const { deliver } = require("./basic.cjs");
function cursorAtEdge(state, view, dir) {
  const p = state.selection.$cursor;
  if (!p) return null;
  const edge = view
    ? view.endOfTextblock(dir < 0 ? "backward" : "forward", state)
    : p.parentOffset === (dir < 0 ? 0 : p.parent.content.size);
  return edge ? p : null;
}
function boundary(p, dir) {
  if (p.parent.type.spec.isolating) return null;
  for (let depth = p.depth - 1; depth >= 0; depth--) {
    if (
      dir < 0
        ? p.index(depth) > 0
        : p.indexAfter(depth) < p.node(depth).childCount
    )
      return p.doc.resolve(dir < 0 ? p.before(depth + 1) : p.after(depth + 1));
    if (p.node(depth).type.spec.isolating) break;
  }
  return null;
}
function textBoundary(node, start, dir, single) {
  let pos = start,
    level = 0;
  while (!node.isTextblock) {
    if (
      node.isLeaf ||
      node.type.spec.isolating ||
      (single && node.childCount !== 1)
    )
      return null;
    if (dir < 0) {
      pos += node.nodeSize - 1 - node.lastChild.nodeSize;
      node = node.lastChild;
    } else {
      pos++;
      node = node.firstChild;
    }
    level++;
  }
  return { node, pos: dir < 0 ? pos + node.nodeSize - 1 : pos + 1, level };
}
function mergeText(state, cut, dispatch) {
  const a = cut.nodeBefore,
    b = cut.nodeAfter;
  if (!a || !b || a.type.spec.isolating || b.type.spec.isolating) return false;
  const left = textBoundary(a, cut.pos - a.nodeSize, -1, false),
    right = textBoundary(b, cut.pos, 1, true);
  if (!left || !right) return false;
  const tr = state.tr.delete(left.pos, right.pos);
  if (!tr.docChanged || tr.doc.eq(state.doc)) return false;
  const mapped = tr.mapping.map(left.pos, -1);
  if (!tr.doc.resolve(mapped).parent.isTextblock) return false;
  tr.setSelection(TextSelection.create(tr.doc, mapped));
  return deliver(tr, dispatch);
}
function collapseBoundary(state, cut, dispatch) {
  const before = cut.nodeBefore,
    after = cut.nodeAfter;
  if (
    !before ||
    !after ||
    before.type.spec.isolating ||
    after.type.spec.isolating
  )
    return false;
  const parent = cut.parent,
    index = cut.index();
  if (
    before.type.compatibleContent(after.type) &&
    parent.canReplace(index, index + 1)
  ) {
    if (before.content.size === 0 && parent.canReplace(index - 1, index))
      return deliver(
        state.tr.delete(cut.pos - before.nodeSize, cut.pos),
        dispatch,
      );
    if (
      canJoin(state.doc, cut.pos) ||
      (before.isTextblock && after.isTextblock)
    )
      return deliver(state.tr.join(cut.pos), dispatch);
  }
  if (parent.canReplace(index, index + 1) && !before.isLeaf) {
    const match = before.contentMatchAt(before.childCount),
      wrappers = match.findWrapping(after.type);
    if (wrappers && match.matchType(wrappers[0] || after.type)?.validEnd) {
      let content = Fragment.empty;
      for (let i = wrappers.length - 1; i >= 0; i--)
        content = Fragment.from(wrappers[i].create(null, content));
      const slice = new Slice(Fragment.from(before.copy(content)), 1, 0),
        tr = state.tr;
      const step = new ReplaceAroundStep(
        cut.pos - 1,
        cut.pos + after.nodeSize,
        cut.pos,
        cut.pos + after.nodeSize,
        slice,
        wrappers.length,
        true,
      );
      if (!tr.maybeStep(step).failed) {
        const end = tr.mapping.map(cut.pos + after.nodeSize, 1),
          p = tr.doc.resolve(end);
        if (p.nodeBefore?.type === p.nodeAfter?.type && canJoin(tr.doc, end))
          tr.join(end);
        return deliver(tr, dispatch);
      }
    }
  }
  const next = Selection.findFrom(cut, 1),
    range = next && next.$from.blockRange(next.$to),
    target = range && liftTarget(range);
  if (target != null && target >= cut.depth)
    return deliver(state.tr.lift(range, target), dispatch);
  return mergeText(state, cut, dispatch);
}
function joinDirection(dir, textOnly = false) {
  return (state, dispatch, view) => {
    const cursor = cursorAtEdge(state, view, dir);
    if (!cursor) return false;
    const cut = boundary(cursor, dir);
    if (!cut) {
      if (dir > 0 || textOnly) return false;
      const range = cursor.blockRange(),
        target = range && liftTarget(range);
      return (
        target != null &&
        (dispatch ? deliver(state.tr.lift(range, target), dispatch) : true)
      );
    }
    if (textOnly) return mergeText(state, cut, dispatch);
    if (collapseBoundary(state, cut, dispatch)) return true;
    const other = dir < 0 ? cut.nodeBefore : cut.nodeAfter;
    if (
      cursor.parent.content.size === 0 &&
      other &&
      (other.isTextblock || NodeSelection.isSelectable(other))
    ) {
      for (let d = cursor.depth; d > 0; d--) {
        const tr = state.tr.delete(cursor.before(d), cursor.after(d));
        if (tr.docChanged && !tr.doc.eq(state.doc)) {
          const pos = tr.mapping.map(cut.pos, dir);
          tr.setSelection(
            other.isTextblock
              ? Selection.near(tr.doc.resolve(pos), dir)
              : NodeSelection.create(
                  tr.doc,
                  dir < 0 ? pos - other.nodeSize : pos,
                ),
          );
          return deliver(tr, dispatch);
        }
        if (d === 1 || cursor.node(d - 1).childCount > 1) break;
      }
    }
    if (other?.isAtom && cut.depth === cursor.depth - 1) {
      const from = dir < 0 ? cut.pos - other.nodeSize : cut.pos;
      return deliver(state.tr.delete(from, from + other.nodeSize), dispatch);
    }
    return false;
  };
}
function selectNodeDirection(dir) {
  return (state, dispatch, view) => {
    const s = state.selection;
    if (!s.empty) return false;
    let p = dir < 0 ? s.$from : s.$to;
    if (p.parent.isTextblock) {
      if (!cursorAtEdge(state, view, dir)) return false;
      p = boundary(p, dir);
      if (!p) return false;
    }
    const node = dir < 0 ? p.nodeBefore : p.nodeAfter;
    if (!node || !NodeSelection.isSelectable(node)) return false;
    return deliver(
      state.tr.setSelection(
        NodeSelection.create(
          state.doc,
          dir < 0 ? p.pos - node.nodeSize : p.pos,
        ),
      ),
      dispatch,
    );
  };
}
module.exports = {
  joinBackward: joinDirection(-1),
  joinForward: joinDirection(1),
  joinTextblockBackward: joinDirection(-1, true),
  joinTextblockForward: joinDirection(1, true),
  selectNodeBackward: selectNodeDirection(-1),
  selectNodeForward: selectNodeDirection(1),
};
