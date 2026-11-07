"use strict";
const { Fragment, Slice, Mark, MarkType } = require("vprosemirror-model");
const { Mapping } = require("./mapping.cjs");
const S = require("./steps.cjs"),
  H = require("./structure.cjs"),
  { replaceStep } = require("./fit.cjs");
class TransformError extends Error {
  constructor(message) {
    super(message);
    this.name = "TransformError";
  }
}
class Transform {
  constructor(doc) {
    this.doc = doc;
    this.steps = [];
    this.docs = [];
    this.mapping = new Mapping();
  }
  get before() {
    return this.docs[0] || this.doc;
  }
  get docChanged() {
    return this.steps.length > 0;
  }
  step(step) {
    const result = this.maybeStep(step);
    if (result.failed) throw new TransformError(result.failed);
    return this;
  }
  maybeStep(step) {
    const result = step.apply(this.doc);
    if (!result.failed) this.addStep(step, result.doc);
    return result;
  }
  addStep(step, doc) {
    this.docs.push(this.doc);
    this.steps.push(step);
    this.mapping.appendMap(step.getMap());
    this.doc = doc;
  }
  changedRange() {
    let from = Infinity,
      to = -Infinity;
    for (const map of this.mapping.maps) {
      if (from !== Infinity) {
        from = map.map(from, 1);
        to = map.map(to, -1);
      }
      map.forEach((_a, _b, c, d) => {
        from = Math.min(from, c);
        to = Math.max(to, d);
      });
    }
    return from === Infinity ? null : { from, to };
  }
  replace(from, to = from, slice = Slice.empty) {
    const step = replaceStep(this.doc, from, to, slice);
    return step ? this.step(step) : this;
  }
  replaceWith(from, to, content) {
    return this.replace(from, to, new Slice(Fragment.from(content), 0, 0));
  }
  delete(from, to) {
    return this.replace(from, to);
  }
  insert(pos, content) {
    return this.replaceWith(pos, pos, content);
  }
  split(pos, depth = 1, typesAfter) {
    return this.step(H.splitStep(this.doc, pos, depth, typesAfter));
  }
  wrap(range, wrappers) {
    return this.step(H.wrapStep(range, wrappers));
  }
  lift(range, target) {
    return this.step(H.liftStep(range, target));
  }
  join(pos, depth = 1) {
    const p = this.doc.resolve(pos),
      before = p.nodeBefore,
      after = p.nodeAfter;
    if (depth === 1 && before?.isTextblock && after?.isTextblock) {
      if (before.type.whitespace === "pre")
        this.convertBreaks(pos, after, before.type);
      this.clearIncompatible(
        pos,
        before.type,
        before.contentMatchAt(before.childCount),
        false,
      );
      if (
        before.type.whitespace !== "pre" &&
        after.type.whitespace === "pre" &&
        before.type.schema.linebreakReplacement &&
        before.type.contentMatch.matchType(
          before.type.schema.linebreakReplacement,
        )
      ) {
        this.setNodeMarkup(pos, before.type, before.attrs, after.marks);
        this.convertBreaks(pos, after, before.type);
      }
    }
    return this.step(
      new S.ReplaceStep(pos - depth, pos + depth, Slice.empty, true),
    );
  }
  setNodeMarkup(pos, type, attrs, marks) {
    const n = this.doc.nodeAt(pos);
    if (!n) throw new RangeError("No node at position " + pos);
    const next = (type || n.type).create(attrs, null, marks || n.marks);
    if (n.isLeaf) return this.replaceWith(pos, pos + n.nodeSize, next);
    if (!next.type.validContent(n.content))
      throw new RangeError("Invalid content for " + next.type.name);
    return this.step(
      new S.ReplaceAroundStep(
        pos,
        pos + n.nodeSize,
        pos + 1,
        pos + n.nodeSize - 1,
        new Slice(Fragment.from(next), 0, 0),
        1,
        true,
      ),
    );
  }
  setNodeAttribute(pos, attr, value) {
    return this.step(new S.AttrStep(pos, attr, value));
  }
  setDocAttribute(attr, value) {
    return this.step(new S.DocAttrStep(attr, value));
  }
  addNodeMark(pos, mark) {
    return this.step(new S.AddNodeMarkStep(pos, mark));
  }
  removeNodeMark(pos, mark) {
    const n = this.doc.nodeAt(pos);
    if (!n) throw new RangeError("No node at position " + pos);
    for (const m of [...n.marks].reverse())
      if (mark instanceof MarkType ? m.type === mark : m.eq(mark))
        this.step(new S.RemoveNodeMarkStep(pos, m));
    return this;
  }
  addMark(from, to, mark) {
    const remove = [],
      add = [];
    this.doc.nodesBetween(from, to, (n, pos, parent) => {
      if (
        !n.isInline ||
        !parent.type.allowsMarkType(mark.type) ||
        mark.isInSet(n.marks)
      )
        return;
      const a = Math.max(from, pos),
        b = Math.min(to, pos + n.nodeSize),
        next = mark.addToSet(n.marks);
      for (const m of n.marks)
        if (!m.isInSet(next)) record(remove, new S.RemoveMarkStep(a, b, m));
      if (mark.isInSet(next)) record(add, new S.AddMarkStep(a, b, mark));
    });
    for (const s of [...remove, ...add]) this.step(s);
    return this;
  }
  removeMark(from, to, mark) {
    const remove = [];
    this.doc.nodesBetween(from, to, (n, pos) => {
      if (!n.isInline) return;
      for (const m of n.marks)
        if (!mark || (mark instanceof MarkType ? m.type === mark : m.eq(mark)))
          record(
            remove,
            new S.RemoveMarkStep(
              Math.max(from, pos),
              Math.min(to, pos + n.nodeSize),
              m,
            ),
          );
    });
    for (const s of remove) this.step(s);
    return this;
  }
  convertBreaks(pos, node, type) {
    const br = type.schema.linebreakReplacement;
    if (!br) return;
    const toText = type.whitespace === "pre",
      toBreak = !toText && type.contentMatch.matchType(br);
    const edits = [];
    node.forEach((n, offset) => {
      if (toText && n.type === br)
        edits.push([
          pos + 1 + offset,
          pos + 2 + offset,
          type.schema.text("\n", n.marks),
        ]);
      else if (toBreak && node.type.whitespace === "pre" && n.isText)
        for (const hit of n.text.matchAll(/\r\n|[\r\n]/g))
          edits.push([
            pos + 1 + offset + hit.index,
            pos + 1 + offset + hit.index + hit[0].length,
            br.create(null, null, n.marks),
          ]);
    });
    for (const [a, b, n] of edits.reverse())
      this.step(new S.ReplaceStep(a, b, new Slice(Fragment.from(n), 0, 0)));
  }
  clearIncompatible(
    pos,
    type,
    match = type.contentMatch,
    clearNewlines = true,
  ) {
    const n = this.doc.nodeAt(pos),
      edits = [];
    let at = pos + 1;
    n.forEach((child) => {
      const next = match.matchType(child.type);
      if (!next)
        edits.push(new S.ReplaceStep(at, at + child.nodeSize, Slice.empty));
      else {
        match = next;
        for (const mark of child.marks)
          if (!type.allowsMarkType(mark.type))
            this.step(new S.RemoveMarkStep(at, at + child.nodeSize, mark));
        if (clearNewlines && child.isText && type.whitespace !== "pre")
          for (const hit of child.text.matchAll(/\r\n|[\r\n]/g))
            edits.push(
              new S.ReplaceStep(
                at + hit.index,
                at + hit.index + hit[0].length,
                new Slice(Fragment.from(type.schema.text(" ")), 0, 0),
              ),
            );
      }
      at += child.nodeSize;
    });
    if (!match.validEnd) {
      const fill = match.fillBefore(Fragment.empty, true);
      if (fill) this.replaceWith(at, at, fill);
    }
    for (const edit of edits.reverse()) this.step(edit);
    return this;
  }
  setBlockType(from, to = from, type, attrs) {
    if (!type.isTextblock) throw new RangeError("Type must be a textblock");
    const start = this.steps.length,
      doc = this.doc;
    doc.nodesBetween(from, to, (n, pos) => {
      if (!n.isTextblock) return;
      const nextAttrs = typeof attrs === "function" ? attrs(n) : attrs;
      if (n.hasMarkup(type, nextAttrs)) return false;
      const mapped = () => this.mapping.slice(start).map(pos, 1),
        p = this.doc.resolve(mapped());
      if (!p.parent.canReplaceWith(p.index(), p.index() + 1, type))
        return false;
      if (type.whitespace === "pre")
        this.convertBreaks(mapped(), this.doc.nodeAt(mapped()), type);
      this.clearIncompatible(
        mapped(),
        type,
        type.contentMatch,
        !type.schema.linebreakReplacement,
      );
      this.setNodeMarkup(mapped(), type, nextAttrs, n.marks);
      if (type.whitespace !== "pre") this.convertBreaks(mapped(), n, type);
      return false;
    });
    return this;
  }
  replaceRange(from, to, slice) {
    if (!slice.size) return this.deleteRange(from, to);
    const a = this.doc.resolve(from),
      b = this.doc.resolve(to),
      targets = [];
    for (let d = Math.min(a.depth, b.depth); d > 0; d--)
      if (from - a.start(d) === a.depth - d && b.end(d) - to === b.depth - d)
        targets.push(d);
    // Preserve a defining source container when replacing a different instance
    // of that container (for example, a quote with different attributes).
    const first = slice.content.firstChild;
    if (first)
      for (const d of targets)
        if (a.node(d).type === first.type && !a.node(d).sameMarkup(first)) {
          targets.splice(targets.indexOf(d), 1);
          targets.unshift(d);
          break;
        }
    for (const d of targets) {
      let content = slice.content;
      for (
        let up = d - 1, opened = 0;
        up > 0 &&
        opened < slice.openStart &&
        content.childCount === 1 &&
        content.firstChild.sameMarkup(a.node(up));
        up--, opened++
      )
        content = content.firstChild.content;
      const closed = closeSlice(content),
        step = new S.ReplaceStep(
          a.before(d),
          b.after(d),
          new Slice(closed, 0, 0),
        );
      if (!step.apply(this.doc).failed) return this.step(step);
    }
    if (from === 0 && to === this.doc.content.size) {
      const step = new S.ReplaceStep(
        from,
        to,
        new Slice(closeSlice(slice.content), 0, 0),
      );
      if (!step.apply(this.doc).failed) return this.step(step);
    }
    if (a.depth && a.parentOffset === 0 && slice.openStart) {
      let n = first,
        defining = false;
      for (let d = 0; n && d < slice.openStart; d++, n = n.firstChild)
        defining ||= !!(n.type.spec.defining || n.type.spec.definingForContent);
      if (defining) {
        const pos = a.before(),
          parent = a.node(a.depth - 1);
        if (
          parent.canReplaceWith(
            a.index(a.depth - 1),
            a.indexAfter(a.depth - 1),
            first.type,
          )
        )
          return this.replace(
            pos,
            to,
            new Slice(slice.content, 0, slice.openEnd),
          );
      }
    }
    return this.replace(from, to, slice);
  }
  replaceRangeWith(from, to, node) {
    if (!node.isInline && from === to) {
      const p = this.doc.resolve(from);
      if (p.parent.content.size) {
        const point = H.insertPoint(this.doc, from, node.type);
        if (point != null) from = to = point;
      }
    }
    return this.replaceRange(from, to, new Slice(Fragment.from(node), 0, 0));
  }
  deleteRange(from, to) {
    const a = this.doc.resolve(from),
      b = this.doc.resolve(to);
    if (
      a.depth !== b.depth &&
      from === a.depth &&
      to === this.doc.content.size - b.depth
    )
      return this.delete(0, this.doc.content.size);
    for (let d = Math.min(a.depth, b.depth); d >= 0; d--) {
      if (from - a.start(d) !== a.depth - d || b.end(d) - to !== b.depth - d)
        continue;
      // Matching boundary distances do not mean both endpoints cover the same
      // container. A nested list start and a later empty paragraph can have
      // those distances while the paragraph itself is outside the selection.
      if (
        a.start(d) !== b.start(d) &&
        !(
          d === a.depth &&
          d === b.depth &&
          a.parent.isTextblock &&
          b.parent.isTextblock &&
          a.start(d - 1) === b.start(d - 1)
        )
      )
        continue;
      if (
        a.node(d).type.contentMatch.validEnd &&
        (a.start(d) === b.start(d) ||
          (d > 0 && a.start(d - 1) === b.start(d - 1) && a.node(d).isTextblock))
      )
        return this.delete(a.start(d), b.end(d));
      if (
        d > 0 &&
        a.start(d - 1) === b.start(d - 1) &&
        a.node(d - 1).canReplace(a.index(d - 1), b.indexAfter(d - 1))
      )
        return this.delete(a.before(d), b.after(d));
      if (d === 0) return this.delete(0, this.doc.content.size);
    }
    // A selection ending at the first editable position of a later branch
    // does not include that branch. Trim the structural tokens at both ends
    // before fitting the deletion, so its paragraph does not become an empty
    // code block inherited from the selection's start.
    const shared = a.sharedDepth(to);
    if (
      from < to &&
      a.parentOffset === 0 &&
      b.parentOffset === 0 &&
      shared < a.depth &&
      shared < b.depth &&
      to - b.start(shared + 1) === b.depth - shared - 1
    ) {
      let depth = a.depth;
      while (
        depth > shared + 1 &&
        from - a.start(depth - 1) === a.depth - depth + 1 &&
        !a.node(depth - 1).type.spec.isolating
      )
        depth--;
      if (!a.node(depth).type.spec.isolating) {
        const start = a.before(depth),
          end = b.before(shared + 1);
        let closing = Fragment.empty;
        for (let level = depth - 1; level > shared; level--)
          closing = Fragment.from(a.node(level).copy(closing));
        // Closing only the surviving left ancestors avoids a general paste
        // search. Step validation still checks the schema before acceptance.
        const step = new S.ReplaceStep(
          start,
          end,
          new Slice(closing, depth - shared - 1, 0),
        );
        if (!this.maybeStep(step).failed) return this;
        return this.delete(start, end);
      }
    }
    if (b.parentOffset < b.parent.content.size) {
      let expand = from;
      for (let d = a.depth; d > 0; d--) {
        if (
          a.node(d).type.spec.isolating ||
          from - a.start(d) !== a.depth - d ||
          to <= a.after(d) ||
          b.start(b.depth) < a.after(d)
        )
          break;
        expand = a.before(d);
      }
      from = expand;
    }
    return this.delete(from, to);
  }
}
function record(list, step) {
  for (let i = list.length - 1; i >= 0; i--) {
    const merged = list[i].merge(step);
    if (merged) {
      list[i] = merged;
      return;
    }
  }
  list.push(step);
}
function closeSlice(fragment) {
  const out = [];
  fragment.forEach((n) => {
    if (n.isLeaf) out.push(n);
    else {
      const child = n.type.createAndFill(
        n.attrs,
        closeSlice(n.content),
        n.marks,
      );
      if (child) out.push(child);
    }
  });
  return Fragment.from(out);
}
module.exports = { Transform, TransformError };
