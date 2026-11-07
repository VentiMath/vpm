"use strict";
const { Fragment, Slice, NodeRange } = require("vprosemirror-model");
const { TextSelection } = require("vprosemirror-state");
const {
  canSplit,
  findWrapping,
  liftTarget,
  ReplaceAroundStep,
  canJoin,
} = require("vprosemirror-transform");
const orderedList = {
  attrs: { order: { default: 1, validate: "number" } },
  parseDOM: [
    {
      tag: "ol",
      getAttrs: (el) => ({
        order: el.hasAttribute("start") ? +el.getAttribute("start") : 1,
      }),
    },
  ],
  toDOM: (node) =>
    node.attrs.order === 1 ? ["ol", 0] : ["ol", { start: node.attrs.order }, 0],
};
const bulletList = { parseDOM: [{ tag: "ul" }], toDOM: () => ["ul", 0] };
const listItem = {
  parseDOM: [{ tag: "li" }],
  toDOM: () => ["li", 0],
  defining: true,
};
function addListNodes(nodes, itemContent, listGroup) {
  const group = listGroup ? { group: listGroup } : {};
  return nodes.append({
    ordered_list: { ...orderedList, content: "list_item+", ...group },
    bullet_list: { ...bulletList, content: "list_item+", ...group },
    list_item: { ...listItem, content: itemContent },
  });
}
const accepts = (types) => (node) =>
  Array.isArray(types) ? types.includes(node.type) : node.type === types;
function itemRange(selection, allowed) {
  return selection.$from.blockRange(
    selection.$to,
    (node) => node.childCount > 0 && allowed(node.firstChild),
  );
}
// Move the gap of complete items beneath its predecessor. Only surrounding
// boundary tokens change, so selections and other mapped positions survive.
function nest(tr, range, listType, attrs, allowed, merge = true) {
  if (!range.startIndex) return false;
  const previous = range.parent.child(range.startIndex - 1);
  if (!allowed(previous)) return false;
  const last = previous.lastChild;
  const join =
    merge &&
    last &&
    last.type === listType &&
    (attrs == null || listType.create(attrs).sameMarkup(last));
  const shell = listType.create(attrs, Fragment.empty);
  const children = range.parent.content.cutByIndex(
    range.startIndex,
    range.endIndex,
  );
  const nested = join
    ? last.copy(last.content.append(children))
    : shell.copy(children);
  if (!nested.type.validContent(nested.content)) return false;
  const after = join
    ? previous.content
        .cutByIndex(0, previous.childCount - 1)
        .append(Fragment.from(nested))
    : previous.content.append(Fragment.from(nested));
  if (!previous.type.validContent(after)) return false;
  if (tr) {
    const wrap = previous.copy(
      Fragment.from(join ? last.copy(Fragment.empty) : shell),
    );
    tr.step(
      new ReplaceAroundStep(
        range.start - (join ? 2 : 1),
        range.end,
        range.start,
        range.end,
        new Slice(Fragment.from(wrap), join ? 2 : 1, 0),
        join ? 0 : 1,
        true,
      ),
    );
  }
  return true;
}
function wrapRangeInList(tr, range, listType, attrs = null) {
  const { $from, $to, depth } = range;
  if (
    depth >= 2 &&
    range.startIndex === 0 &&
    $from.node(depth - 1).type.compatibleContent(listType)
  ) {
    const doc = $from.doc;
    const items = new NodeRange(
      doc.resolve($from.before(depth)),
      doc.resolve($to.after(depth)),
      depth - 1,
    );
    return nest(
      tr,
      items,
      listType,
      attrs,
      (n) => n.type === range.parent.type,
      false,
    );
  }
  const wrappers = findWrapping(range, listType, attrs);
  if (!wrappers) return false;
  if (!tr) return true;
  const before = tr.mapping.maps.length;
  const boundaries = [];
  let pos = range.start;
  for (let i = range.startIndex; i < range.endIndex; i++) {
    if (i > range.startIndex) boundaries.push(pos);
    pos += range.parent.child(i).nodeSize;
  }
  tr.wrap(range, wrappers);
  const splitDepth =
    wrappers.length - wrappers.findIndex((w) => w.type === listType) - 1;
  for (const boundary of boundaries) {
    const at = tr.mapping.slice(before).map(boundary, 1);
    if (splitDepth > 0 && canSplit(tr.doc, at, splitDepth))
      tr.split(at, splitDepth);
  }
  return true;
}
function wrapInList(listType, attrs = null) {
  return (state, dispatch) => {
    const range = state.selection.$from.blockRange(state.selection.$to);
    if (!range) return false;
    const tr = dispatch ? state.tr : null;
    if (!wrapRangeInList(tr, range, listType, attrs)) return false;
    if (dispatch) dispatch(tr.scrollIntoView());
    return true;
  };
}
function splitEmptyNested(state, dispatch, allowed) {
  const { $from } = state.selection,
    d = $from.depth;
  if (
    d < 4 ||
    !allowed($from.node(d - 3)) ||
    $from.index(d - 2) !== $from.node(d - 2).childCount - 1
  )
    return false;
  const innerItem = $from.node(d - 1),
    outerItem = $from.node(d - 3);
  if ($from.index(d - 1) !== innerItem.childCount - 1) return false;
  const list = $from.node(d - 2),
    listIndex = $from.index(d - 3);
  let priorItems = list.content.cutByIndex(0, $from.index(d - 2));
  const priorBlocks = innerItem.content.cutByIndex(0, $from.index(d - 1));
  if (priorBlocks.size)
    priorItems = priorItems.append(Fragment.from(innerItem.copy(priorBlocks)));
  let left = outerItem.content.cutByIndex(0, listIndex);
  if (priorItems.size) left = left.append(Fragment.from(list.copy(priorItems)));
  const right = outerItem.content.cutByIndex(listIndex + 1);
  const fresh = outerItem.type.createAndFill();
  if (!fresh) return false;
  const nodes = [];
  if (left.size) nodes.push(outerItem.copy(left));
  const freshOffset = nodes.reduce((n, x) => n + x.nodeSize, 0);
  nodes.push(fresh);
  if (right.size) nodes.push(outerItem.copy(right));
  if (nodes.some((n) => !n.type.validContent(n.content))) return false;
  const start = $from.before(d - 3),
    end = $from.after(d - 3);
  const outerList = $from.node(d - 4),
    index = $from.index(d - 4);
  if (!outerList.canReplace(index, index + 1, Fragment.from(nodes)))
    return false;
  if (dispatch) {
    // Use the minimal document difference: unchanged text outside the empty
    // item remains shared and mapped rather than replacing the entire list.
    const replacement = Fragment.from(nodes);
    const old = Fragment.from(outerItem);
    const from = old.findDiffStart(replacement),
      ends = old.findDiffEnd(replacement);
    const tr = state.tr;
    if (from != null) {
      const overlap = Math.max(0, from - Math.min(ends.a, ends.b));
      const target = state.doc.replace(
        start,
        end,
        new Slice(replacement, 0, 0),
      );
      tr.replace(
        start + from,
        start + ends.a + overlap,
        target.slice(start + from, start + ends.b + overlap),
      );
    }
    tr.setSelection(
      TextSelection.near(tr.doc.resolve(start + freshOffset + 1)),
    ).scrollIntoView();
    dispatch(tr);
  }
  return true;
}
function splitListItem(types, itemAttrs) {
  const allowed = accepts(types);
  return (state, dispatch) => {
    const { $from, $to, node } = state.selection;
    if (
      node?.isBlock ||
      $from.depth < 2 ||
      !$from.sameParent($to) ||
      !allowed($from.node(-1))
    )
      return false;
    const item = $from.node(-1);
    if (!$from.parent.content.size && $from.indexAfter(-1) === item.childCount)
      return splitEmptyNested(state, dispatch, allowed);
    const tr = state.tr.delete($from.pos, $to.pos);
    const atEnd = $to.parentOffset === $to.parent.content.size;
    const afterType = atEnd ? item.contentMatchAt(0).defaultType : null;
    const after = afterType
      ? [{ type: item.type, attrs: itemAttrs }, { type: afterType }]
      : undefined;
    if (!canSplit(tr.doc, $from.pos, 2, after)) return false;
    if (dispatch) dispatch(tr.split($from.pos, 2, after).scrollIntoView());
    return true;
  };
}
function splitListItemKeepMarks(types, attrs) {
  const split = splitListItem(types, attrs);
  return (state, dispatch) =>
    split(
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
function sinkListItem(types) {
  const allowed = accepts(types);
  return (state, dispatch) => {
    const range = itemRange(state.selection, allowed);
    if (!range) return false;
    const tr = dispatch ? state.tr : null;
    if (!nest(tr, range, range.parent.type, null, allowed)) return false;
    if (dispatch) dispatch(tr.scrollIntoView());
    return true;
  };
}
function liftListItem(types) {
  const allowed = accepts(types);
  return (state, dispatch) => {
    let range = itemRange(state.selection, allowed);
    if (!range) return false;
    let tr = state.tr;
    if (range.depth > 1 && allowed(range.$from.node(range.depth - 1))) {
      const depth = range.depth,
        start = range.start,
        count = range.endIndex - range.startIndex;
      if (range.endIndex < range.parent.childCount) {
        const tail = new NodeRange(
          tr.doc.resolve(range.end),
          tr.doc.resolve(range.$to.end(depth)),
          depth,
        );
        if (!nest(tr, tail, range.parent.type, null, allowed)) return false;
      }
      const $start = tr.doc.resolve(start);
      let end = start;
      for (let i = 0; i < count; i++)
        end += $start.parent.child($start.index() + i).nodeSize;
      range = new NodeRange($start, tr.doc.resolve(end), depth);
      const target = liftTarget(range);
      if (target == null || target !== depth - 2) return false;
      tr.lift(range, target);
      const boundary = tr.mapping.map(end, -1) - 1;
      const $join = tr.doc.resolve(Math.max(0, boundary));
      if (
        $join.nodeBefore &&
        $join.nodeAfter &&
        $join.nodeBefore.type === $join.nodeAfter.type &&
        canJoin(tr.doc, boundary)
      )
        tr.join(boundary);
    } else {
      // Unwrap from right to left, preserving each item's content as a gap.
      const positions = [];
      let pos = range.start;
      for (let i = range.startIndex; i < range.endIndex; i++) {
        const item = range.parent.child(i);
        positions.push([pos, item.nodeSize]);
        pos += item.nodeSize;
      }
      // Merge compatible item shells first, then lift their combined content
      // once. Strict schemas that reject a merged shell keep the general path.
      const merged = state.tr;
      let canMerge = positions.length > 1;
      for (let i = positions.length - 1; canMerge && i > 0; i--) {
        canMerge = canJoin(merged.doc, positions[i][0]);
        if (canMerge) merged.join(positions[i][0]);
      }
      if (canMerge) {
        const at = positions[0][0],
          size = merged.doc.nodeAt(at).nodeSize;
        const content = merged.doc
          .resolve(at + 1)
          .blockRange(merged.doc.resolve(at + size - 1));
        const target = content && liftTarget(content);
        if (target == null || target !== range.depth - 1) return false;
        tr = merged.lift(content, target);
      } else
        for (let i = positions.length - 1; i >= 0; i--) {
          const [at, size] = positions[i];
          const inner = tr.doc
            .resolve(at + 1)
            .blockRange(tr.doc.resolve(at + size - 1));
          const target = inner && liftTarget(inner);
          if (target == null || target !== range.depth - 1) return false;
          tr.lift(inner, target);
        }
    }
    if (dispatch) dispatch(tr.scrollIntoView());
    return true;
  };
}
module.exports = {
  orderedList,
  bulletList,
  listItem,
  addListNodes,
  wrapInList,
  wrapRangeInList,
  splitListItem,
  splitListItemKeepMarks,
  liftListItem,
  sinkListItem,
};
