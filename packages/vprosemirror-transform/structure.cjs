"use strict";
const { Fragment, Slice } = require("vprosemirror-model");
const { ReplaceStep, ReplaceAroundStep } = require("./steps.cjs");
function splitStep(doc, pos, depth = 1, typesAfter) {
  const p = doc.resolve(pos);
  if (depth < 1 || depth > p.depth) throw new RangeError("Invalid split depth");
  let a = Fragment.empty,
    b = Fragment.empty;
  for (let d = p.depth; d > p.depth - depth; d--) {
    a = Fragment.from(p.node(d).copy(a));
    const t = typesAfter?.[d - (p.depth - depth) - 1];
    b = Fragment.from(t ? t.type.create(t.attrs, b) : p.node(d).copy(b));
  }
  return new ReplaceStep(pos, pos, new Slice(a.append(b), depth, depth), true);
}
function canSplit(doc, pos, depth = 1, typesAfter) {
  const p = doc.resolve(pos);
  if (depth < 1 || depth > p.depth) return false;
  for (let d = p.depth; d > p.depth - depth; d--)
    if (p.node(d).type.spec.isolating) return false;
  try {
    return !splitStep(doc, pos, depth, typesAfter).apply(doc).failed;
  } catch {
    return false;
  }
}
function canJoin(doc, pos) {
  const p = doc.resolve(pos),
    a = p.nodeBefore,
    b = p.nodeAfter;
  return !!(
    a &&
    b &&
    !a.isLeaf &&
    a.canAppend(b) &&
    p.parent.canReplace(p.index(), p.index() + 1)
  );
}
function joinPoint(doc, pos, dir = -1) {
  const p = doc.resolve(pos);
  for (let d = p.depth; d >= 0; d--) {
    let at = pos,
      a,
      b;
    if (d === p.depth) {
      a = p.nodeBefore;
      b = p.nodeAfter;
    } else {
      at = dir < 0 ? p.before(d + 1) : p.after(d + 1);
      const idx = p.index(d) + (dir > 0 ? 1 : 0);
      a = p.node(d).maybeChild(idx - 1);
      b = p.node(d).maybeChild(idx);
    }
    if (a && b && !a.isTextblock && canJoin(doc, at)) return at;
  }
  return undefined;
}
function insertPoint(doc, pos, type) {
  const p = doc.resolve(pos);
  if (p.parent.canReplaceWith(p.index(), p.index(), type)) return pos;
  for (const side of [-1, 1]) {
    if (
      side < 0 ? p.parentOffset !== 0 : p.parentOffset !== p.parent.content.size
    )
      continue;
    for (let d = p.depth - 1; d >= 0; d--) {
      const at = side < 0 ? p.before(d + 1) : p.after(d + 1),
        index = p.index(d) + (side > 0 ? 1 : 0);
      if (p.node(d).canReplaceWith(index, index, type)) return at;
      if (side < 0 ? p.index(d) > 0 : p.indexAfter(d) < p.node(d).childCount)
        break;
    }
  }
  return null;
}
function liftTarget(range) {
  for (let d = range.depth - 1; d >= 0; d--) {
    if (range.$from.node(d + 1).type.spec.isolating) return null;
    try {
      if (!liftStep(range, d).apply(range.$from.doc).failed) return d;
    } catch {}
  }
  return null;
}
function findWrapping(range, type, attrs = null, inner = range) {
  const p = range.parent,
    outer = p.contentMatchAt(range.startIndex).findWrapping(type);
  if (!outer) return null;
  const outside = outer.length ? outer[0] : type;
  if (!p.canReplaceWith(range.startIndex, range.endIndex, outside)) return null;
  const first = inner.parent.child(inner.startIndex),
    inside = type.contentMatch.findWrapping(first.type);
  if (!inside) return null;
  let match = (inside.length ? inside.at(-1) : type).contentMatch;
  for (let i = inner.startIndex; i < inner.endIndex; i++) {
    match = match.matchType(inner.parent.child(i).type);
    if (!match) return null;
  }
  if (!match.validEnd) return null;
  return [
    ...outer.map((type) => ({ type, attrs: null })),
    { type, attrs },
    ...inside.map((type) => ({ type, attrs: null })),
  ];
}
function wrapStep(range, wrappers) {
  let content = Fragment.empty;
  for (let i = wrappers.length - 1; i >= 0; i--) {
    const w = wrappers[i];
    if (content.size && !w.type.validContent(content))
      throw new RangeError("Wrapper content does not fit");
    content = Fragment.from(w.type.create(w.attrs, content));
  }
  return new ReplaceAroundStep(
    range.start,
    range.end,
    range.start,
    range.end,
    new Slice(content, 0, 0),
    wrappers.length,
    true,
  );
}
function liftStep(range, target) {
  const { $from: a, $to: b, depth } = range;
  let from = range.start,
    to = range.end,
    left = Fragment.empty,
    right = Fragment.empty,
    openLeft = 0,
    openRight = 0;
  for (let d = depth; d > target; d--) {
    if (left.size || a.index(d) > 0) {
      left = Fragment.from(a.node(d).copy(left));
      openLeft++;
    } else from--;
    if (right.size || b.indexAfter(d) < b.node(d).childCount) {
      right = Fragment.from(b.node(d).copy(right));
      openRight++;
    } else to++;
  }
  return new ReplaceAroundStep(
    from,
    to,
    range.start,
    range.end,
    new Slice(left.append(right), openLeft, openRight),
    left.size - openLeft,
    true,
  );
}
function dropPoint(doc, pos, slice) {
  const p = doc.resolve(pos);
  let content = slice.content;
  for (let d = 0; d < slice.openStart; d++)
    content = content.firstChild.content;
  if (!content.size) return pos;
  for (let wrap = 0; wrap < 2; wrap++)
    for (let d = p.depth; d >= 0; d--) {
      const parent = p.node(d),
        bias =
          d === p.depth
            ? 0
            : p.pos - (p.start(d + 1) + p.end(d + 1)) / 2 <= 0
              ? -1
              : 1,
        index = p.index(d) + (bias > 0 ? 1 : 0);
      let fits = parent.canReplace(index, index, content);
      if (wrap && !fits) {
        const wrappers = parent
          .contentMatchAt(index)
          .findWrapping(content.firstChild.type);
        fits = !!(
          wrappers?.length && parent.canReplaceWith(index, index, wrappers[0])
        );
      }
      if (fits)
        return bias === 0 ? pos : bias < 0 ? p.before(d + 1) : p.after(d + 1);
    }
  return null;
}
module.exports = {
  splitStep,
  canSplit,
  canJoin,
  joinPoint,
  insertPoint,
  liftTarget,
  findWrapping,
  wrapStep,
  liftStep,
  dropPoint,
};
