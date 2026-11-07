"use strict";
const { Slice, Fragment } = require("vprosemirror-model");
const selections = new Map();
function integer(value) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError("Invalid selection position");
  return value;
}
class SelectionRange {
  constructor($from, $to) {
    this.$from = $from;
    this.$to = $to;
  }
}
class Selection {
  constructor($anchor, $head, ranges) {
    this.$anchor = $anchor;
    this.$head = $head;
    this.ranges = ranges || [
      new SelectionRange(
        $anchor.pos < $head.pos ? $anchor : $head,
        $anchor.pos < $head.pos ? $head : $anchor,
      ),
    ];
  }
  get anchor() {
    return this.$anchor.pos;
  }
  get head() {
    return this.$head.pos;
  }
  get from() {
    return this.$from.pos;
  }
  get to() {
    return this.$to.pos;
  }
  get $from() {
    return this.ranges[0].$from;
  }
  get $to() {
    return this.ranges[0].$to;
  }
  get empty() {
    return this.ranges.every((r) => r.$from.pos === r.$to.pos);
  }
  content() {
    return this.$from.doc.slice(this.from, this.to, true);
  }
  replace(tr, content = Slice.empty) {
    const start = tr.steps.length;
    let last = content.content.lastChild,
      parent = null;
    for (let d = 0; d < content.openEnd && last; d++) {
      parent = last;
      last = last.lastChild;
    }
    const bias = last?.isInline || (!last && parent?.isTextblock) ? -1 : 1;
    for (let i = 0; i < this.ranges.length; i++) {
      const r = this.ranges[i],
        mapping = tr.mapping.slice(start);
      tr.replaceRange(
        mapping.map(r.$from.pos),
        mapping.map(r.$to.pos),
        i ? Slice.empty : content,
      );
      if (i === 0) insertionSelection(tr, start, bias);
    }
  }
  replaceWith(tr, node) {
    const start = tr.steps.length;
    for (let i = 0; i < this.ranges.length; i++) {
      const r = this.ranges[i],
        mapping = tr.mapping.slice(start),
        a = mapping.map(r.$from.pos),
        b = mapping.map(r.$to.pos);
      if (i === 0) {
        tr.replaceRangeWith(a, b, node);
        insertionSelection(tr, start, node.isInline ? -1 : 1);
      } else tr.deleteRange(a, b);
    }
  }
  getBookmark() {
    return TextSelection.between(this.$anchor, this.$head).getBookmark();
  }
  static findFrom(pos, dir, textOnly = false) {
    if (pos.parent.inlineContent) return new TextSelection(pos);
    let found = scan(pos.parent, pos.pos, pos.index(), dir, textOnly, pos.doc);
    if (found) return found;
    for (let d = pos.depth - 1; d >= 0; d--) {
      const index = pos.index(d) + (dir > 0 ? 1 : 0),
        at = dir > 0 ? pos.after(d + 1) : pos.before(d + 1);
      found = scan(pos.node(d), at, index, dir, textOnly, pos.doc);
      if (found) return found;
    }
    return null;
  }
  static near(pos, bias = 1) {
    return (
      Selection.findFrom(pos, bias) ||
      Selection.findFrom(pos, -bias) ||
      new AllSelection(pos.doc)
    );
  }
  static atStart(doc) {
    return Selection.findFrom(doc.resolve(0), 1) || new AllSelection(doc);
  }
  static atEnd(doc) {
    return (
      Selection.findFrom(doc.resolve(doc.content.size), -1) ||
      new AllSelection(doc)
    );
  }
  static fromJSON(doc, json) {
    if (!json || typeof json.type !== "string" || !selections.has(json.type))
      throw new RangeError("Unknown selection type");
    return selections.get(json.type).fromJSON(doc, json);
  }
  static jsonID(id, type) {
    if (selections.has(id))
      throw new RangeError("Duplicate selection type: " + id);
    selections.set(id, type);
    type.prototype.jsonID = id;
    return type;
  }
}
Selection.prototype.visible = true;
function scan(parent, at, index, dir, textOnly, doc) {
  for (
    let i = dir > 0 ? index : index - 1;
    i >= 0 && i < parent.childCount;
    i += dir
  ) {
    const child = parent.child(i),
      before = dir > 0 ? at : at - child.nodeSize;
    if (!child.isAtom) {
      if (child.inlineContent)
        return new TextSelection(
          doc.resolve(dir > 0 ? before + 1 : before + child.nodeSize - 1),
        );
      const found = scan(
        child,
        dir > 0 ? before + 1 : before + child.nodeSize - 1,
        dir > 0 ? 0 : child.childCount,
        dir,
        textOnly,
        doc,
      );
      if (found) return found;
    } else if (!textOnly && NodeSelection.isSelectable(child))
      return NodeSelection.create(doc, before);
    at += dir * child.nodeSize;
  }
  return null;
}
function insertionSelection(tr, start, bias) {
  if (tr.steps.length === start) return;
  const map = tr.steps.at(-1).getMap();
  let end = null;
  map.forEach((_a, _b, _c, d) => {
    if (end === null) end = d;
  });
  if (end !== null) tr.setSelection(Selection.near(tr.doc.resolve(end), bias));
}
class TextSelection extends Selection {
  constructor(anchor, head = anchor) {
    super(anchor, head);
  }
  get $cursor() {
    return this.anchor === this.head ? this.$head : null;
  }
  map(doc, mapping) {
    const head = doc.resolve(mapping.map(this.head));
    if (!head.parent.inlineContent) return Selection.near(head);
    const anchor = doc.resolve(mapping.map(this.anchor));
    return new TextSelection(anchor.parent.inlineContent ? anchor : head, head);
  }
  replace(tr, content = Slice.empty) {
    const marks =
      content === Slice.empty ? this.$from.marksAcross(this.$to) : null;
    super.replace(tr, content);
    if (marks) tr.ensureMarks(marks);
  }
  eq(other) {
    return (
      other instanceof TextSelection &&
      other.anchor === this.anchor &&
      other.head === this.head
    );
  }
  toJSON() {
    return { type: "text", anchor: this.anchor, head: this.head };
  }
  getBookmark() {
    return new TextBookmark(this.anchor, this.head);
  }
  static fromJSON(doc, json) {
    return TextSelection.create(doc, integer(json.anchor), integer(json.head));
  }
  static create(doc, anchor, head = anchor) {
    return new TextSelection(doc.resolve(anchor), doc.resolve(head));
  }
  static between(anchor, head, bias) {
    const delta = anchor.pos - head.pos;
    const search = delta === 0 ? bias || 1 : delta > 0 ? 1 : -1;
    if (!head.parent.inlineContent) {
      const found =
        Selection.findFrom(head, search, true) ||
        Selection.findFrom(head, -search, true);
      if (!found) return Selection.near(head, search);
      head = found.$head;
    }
    if (!anchor.parent.inlineContent) {
      if (delta === 0) anchor = head;
      else {
        const found =
          Selection.findFrom(anchor, -search, true) ||
          Selection.findFrom(anchor, search, true);
        anchor = found ? found.$anchor : head;
        if (anchor.pos < head.pos !== delta < 0) anchor = head;
      }
    }
    return new TextSelection(anchor, head);
  }
}
class TextBookmark {
  constructor(anchor, head) {
    this.anchor = anchor;
    this.head = head;
  }
  map(m) {
    return new TextBookmark(m.map(this.anchor), m.map(this.head));
  }
  resolve(doc) {
    return TextSelection.between(
      doc.resolve(this.anchor),
      doc.resolve(this.head),
    );
  }
}
class NodeSelection extends Selection {
  constructor(pos) {
    const node = pos.nodeAfter;
    if (!node) throw new RangeError("No node at selection position");
    super(pos, pos.doc.resolve(pos.pos + node.nodeSize));
    this.node = node;
  }
  map(doc, m) {
    const r = m.mapResult(this.anchor);
    return r.deleted
      ? Selection.near(doc.resolve(r.pos))
      : new NodeSelection(doc.resolve(r.pos));
  }
  content() {
    return new Slice(Fragment.from(this.node), 0, 0);
  }
  eq(other) {
    return other instanceof NodeSelection && other.anchor === this.anchor;
  }
  toJSON() {
    return { type: "node", anchor: this.anchor };
  }
  getBookmark() {
    return new NodeBookmark(this.anchor);
  }
  static fromJSON(doc, j) {
    return NodeSelection.create(doc, integer(j.anchor));
  }
  static create(doc, pos) {
    return new NodeSelection(doc.resolve(pos));
  }
  static isSelectable(node) {
    return !node.isText && node.type.spec.selectable !== false;
  }
}
NodeSelection.prototype.visible = false;
class NodeBookmark {
  constructor(anchor) {
    this.anchor = anchor;
  }
  map(m) {
    const r = m.mapResult(this.anchor);
    return r.deleted ? new TextBookmark(r.pos, r.pos) : new NodeBookmark(r.pos);
  }
  resolve(doc) {
    const p = doc.resolve(this.anchor);
    return p.nodeAfter && NodeSelection.isSelectable(p.nodeAfter)
      ? new NodeSelection(p)
      : Selection.near(p);
  }
}
const allBookmark = Object.freeze({
  map() {
    return this;
  },
  resolve(doc) {
    return new AllSelection(doc);
  },
});
class AllSelection extends Selection {
  constructor(doc) {
    super(doc.resolve(0), doc.resolve(doc.content.size));
  }
  replace(tr, content = Slice.empty) {
    if (content === Slice.empty) {
      tr.delete(0, tr.doc.content.size);
      const next = Selection.atStart(tr.doc);
      if (!next.eq(tr.selection)) tr.setSelection(next);
    } else super.replace(tr, content);
  }
  eq(other) {
    return other instanceof AllSelection;
  }
  toJSON() {
    return { type: "all" };
  }
  map(doc) {
    return new AllSelection(doc);
  }
  getBookmark() {
    return allBookmark;
  }
  static fromJSON(doc) {
    return new AllSelection(doc);
  }
}
Selection.jsonID("text", TextSelection);
Selection.jsonID("node", NodeSelection);
Selection.jsonID("all", AllSelection);
module.exports = {
  Selection,
  SelectionRange,
  TextSelection,
  NodeSelection,
  AllSelection,
};
