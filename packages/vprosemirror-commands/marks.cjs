"use strict";
const { canJoin } = require("vprosemirror-transform");
const { deliver } = require("./basic.cjs");
function markRanges(doc, selection, enter) {
  const result = [];
  for (const r of selection.ranges) {
    let from = r.$from.pos,
      to = r.$to.pos;
    if (!enter)
      doc.nodesBetween(from, to, (node, pos) => {
        if (
          node.isInline &&
          node.isAtom &&
          !node.isLeaf &&
          pos >= from &&
          pos + node.nodeSize <= to
        ) {
          result.push({ from, to: pos + 1 });
          from = pos + node.nodeSize - 1;
          return false;
        }
      });
    result.push({ from, to });
  }
  return result;
}
function trim(doc, range) {
  let { from, to } = range;
  const a = doc.resolve(from).nodeAfter,
    b = doc.resolve(to).nodeBefore;
  const lead = a?.isText ? /^\s*/.exec(a.text)[0].length : 0,
    trail = b?.isText ? /\s*$/.exec(b.text)[0].length : 0;
  if (from + lead < to - trail) {
    from += lead;
    to -= trail;
  }
  return { from, to };
}
function toggleMark(type, attrs = null, options = {}) {
  return (state, dispatch) => {
    const s = state.selection,
      cursor = s.$cursor;
    if (s.empty && !cursor) return false;
    if (cursor) {
      if (!cursor.parent.type.allowsMarkType(type)) return false;
      if (dispatch) {
        const marks = state.storedMarks || cursor.marks(),
          tr = state.tr;
        if (type.isInSet(marks)) tr.removeStoredMark(type);
        else tr.addStoredMark(type.create(attrs));
        dispatch(tr);
      }
      return true;
    }
    const ranges = markRanges(state.doc, s, options.enterInlineAtoms !== false);
    let allowed = false,
      present = false,
      missing = false;
    for (const r of ranges)
      state.doc.nodesBetween(r.from, r.to, (node, pos, parent) => {
        if (node.isInline && parent.type.allowsMarkType(type)) {
          allowed = true;
          const has = type.isInSet(node.marks);
          if (has) present = true;
          else if (
            !node.isText ||
            !/^[\s]*$/.test(
              node.text.slice(
                Math.max(0, r.from - pos),
                Math.min(node.text.length, r.to - pos),
              ),
            )
          )
            missing = true;
        }
      });
    if (!allowed) return false;
    if (!dispatch) return true;
    const remove = options.removeWhenPresent === false ? !missing : present,
      tr = state.tr;
    for (const r of ranges) {
      if (remove) tr.removeMark(r.from, r.to, type);
      else {
        const range = options.includeWhitespace ? r : trim(state.doc, r);
        tr.addMark(range.from, range.to, type.create(attrs));
      }
    }
    return deliver(tr, dispatch);
  };
}
function autoJoin(command, matcher) {
  const match = Array.isArray(matcher)
    ? (a, b) => matcher.includes(a.type.name)
    : matcher;
  return (state, dispatch, view) =>
    command(
      state,
      dispatch &&
        ((tr) => {
          if (tr.isGeneric) {
            let ranges = [];
            for (const map of tr.mapping.maps) {
              ranges = ranges.map((r) => ({
                from: map.map(r.from, -1),
                to: map.map(r.to, 1),
              }));
              map.forEach((_a, _b, from, to) => ranges.push({ from, to }));
            }
            const candidates = [];
            tr.doc.descendants((_n, pos) => {
              if (pos > 0 && ranges.some((r) => pos >= r.from && pos <= r.to)) {
                const p = tr.doc.resolve(pos),
                  a = p.nodeBefore,
                  b = p.nodeAfter;
                if (
                  a &&
                  b &&
                  a.type === b.type &&
                  match(a, b) &&
                  canJoin(tr.doc, pos)
                )
                  candidates.push(pos);
              }
            });
            for (const pos of [...new Set(candidates)].sort((a, b) => b - a))
              if (canJoin(tr.doc, pos)) tr.join(pos);
          }
          dispatch(tr);
        }),
      view,
    );
}
module.exports = { toggleMark, autoJoin };
