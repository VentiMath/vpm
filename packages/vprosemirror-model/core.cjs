"use strict";
const emptyAttrs = Object.freeze(Object.create(null));
function equal(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((k) => Object.hasOwn(b, k) && equal(a[k], b[k]))
  );
}
class Mark {
  constructor(type, attrs) {
    this.type = type;
    this.attrs = attrs;
  }
  eq(other) {
    return (
      this === other ||
      (this.type === other.type && equal(this.attrs, other.attrs))
    );
  }
  addToSet(set) {
    if (set.some((m) => this.eq(m))) return set;
    for (const m of set)
      if (!this.type.excludes(m.type) && m.type.excludes(this.type)) return set;
    const out = set.filter((m) => !this.type.excludes(m.type));
    const at = out.findIndex((m) => m.type.rank > this.type.rank);
    out.splice(at < 0 ? out.length : at, 0, this);
    return out;
  }
  removeFromSet(set) {
    const i = set.findIndex((m) => this.eq(m));
    return i < 0 ? set : set.slice(0, i).concat(set.slice(i + 1));
  }
  isInSet(set) {
    return set.some((m) => this.eq(m));
  }
  toJSON() {
    const out = { type: this.type.name };
    if (Object.keys(this.attrs).length) out.attrs = this.attrs;
    return out;
  }
  static fromJSON(schema, json) {
    if (!json || !schema.marks[json.type])
      throw new RangeError("Invalid mark type: " + json?.type);
    return schema.mark(json.type, json.attrs);
  }
  static sameSet(a, b) {
    return a === b || (a.length === b.length && a.every((m, i) => m.eq(b[i])));
  }
  static setFrom(value) {
    if (!value || (!value.length && !(value instanceof Mark))) return Mark.none;
    return value instanceof Mark
      ? [value]
      : value.slice().sort((a, b) => a.type.rank - b.type.rank);
  }
}
Mark.none = Object.freeze([]);
function mergePush(array, node) {
  const prev = array.at(-1);
  if (prev?.isText && node.isText && prev.sameMarkup(node))
    array[array.length - 1] = prev.withText(prev.text + node.text);
  else array.push(node);
}
class Fragment {
  constructor(content, size) {
    this.content = content;
    this.size = size ?? content.reduce((n, c) => n + c.nodeSize, 0);
  }
  get childCount() {
    return this.content.length;
  }
  get firstChild() {
    return this.content[0] || null;
  }
  get lastChild() {
    return this.content.at(-1) || null;
  }
  child(i) {
    const n = this.content[i];
    if (!n) throw new RangeError("Index " + i + " out of range for " + this);
    return n;
  }
  maybeChild(i) {
    return this.content[i] || null;
  }
  forEach(fn) {
    let pos = 0;
    this.content.forEach((n, i) => {
      fn(n, pos, i);
      pos += n.nodeSize;
    });
  }
  nodesBetween(from, to, fn, start = 0, parent) {
    let pos = 0;
    for (let i = 0; i < this.childCount && pos < to; i++) {
      const n = this.content[i],
        end = pos + n.nodeSize;
      if (
        end > from &&
        fn(n, start + pos, parent || null, i) !== false &&
        !n.isLeaf
      )
        n.nodesBetween(
          Math.max(0, from - pos - 1),
          Math.min(n.content.size, to - pos - 1),
          fn,
          start + pos + 1,
        );
      pos = end;
    }
  }
  descendants(fn) {
    this.nodesBetween(0, this.size, fn);
  }
  textBetween(from, to, separator, leaf) {
    let result = "",
      first = true;
    this.nodesBetween(from, to, (n, pos) => {
      const text = n.isText
        ? n.text.slice(Math.max(0, from - pos), to - pos)
        : n.isLeaf
          ? leaf != null
            ? typeof leaf === "function"
              ? leaf(n)
              : leaf
            : n.type.spec.leafText
              ? n.type.spec.leafText(n)
              : ""
          : "";
      if (n.isBlock && (n.isTextblock || (n.isLeaf && text))) {
        if (!first && separator) result += separator;
        first = false;
      }
      result += text;
    });
    return result;
  }
  append(other) {
    if (!other.size) return this;
    if (!this.size) return other;
    const out = this.content.slice();
    for (const n of other.content) mergePush(out, n);
    return new Fragment(out, this.size + other.size);
  }
  cut(from, to = this.size) {
    if (from === 0 && to === this.size) return this;
    const out = [];
    let pos = 0;
    for (const n of this.content) {
      const end = pos + n.nodeSize;
      if (end > from && pos < to) {
        let part = n;
        if (pos < from || end > to)
          part = n.isText
            ? n.cut(Math.max(0, from - pos), Math.min(n.text.length, to - pos))
            : n.cut(
                Math.max(0, from - pos - 1),
                Math.min(n.content.size, to - pos - 1),
              );
        out.push(part);
      }
      pos = end;
      if (pos >= to) break;
    }
    return out.length ? new Fragment(out) : Fragment.empty;
  }
  cutByIndex(from, to) {
    return from === to
      ? Fragment.empty
      : from === 0 && to === this.childCount
        ? this
        : new Fragment(this.content.slice(from, to));
  }
  replaceChild(i, node) {
    if (this.child(i) === node) return this;
    const out = this.content.slice();
    out[i] = node;
    return new Fragment(
      out,
      this.size - this.child(i).nodeSize + node.nodeSize,
    );
  }
  addToStart(n) {
    return new Fragment([n, ...this.content], this.size + n.nodeSize);
  }
  addToEnd(n) {
    return new Fragment([...this.content, n], this.size + n.nodeSize);
  }
  eq(other) {
    return (
      this === other ||
      (this.childCount === other.childCount &&
        this.content.every((n, i) => n.eq(other.content[i])))
    );
  }
  findIndex(pos) {
    if (pos < 0 || pos > this.size)
      throw new RangeError("Position " + pos + " outside of fragment");
    let offset = 0;
    for (let i = 0; i < this.childCount; i++) {
      const end = offset + this.content[i].nodeSize;
      if (end > pos) return { index: i, offset };
      offset = end;
    }
    return { index: this.childCount, offset };
  }
  findDiffStart(other, pos = 0) {
    let i = 0;
    for (; ; i++) {
      if (i === this.childCount || i === other.childCount)
        return this.childCount === other.childCount ? null : pos;
      const a = this.child(i),
        b = other.child(i);
      if (a === b) {
        pos += a.nodeSize;
        continue;
      }
      if (!a.sameMarkup(b)) return pos;
      if (a.isText && a.text !== b.text) {
        let j = 0;
        while (
          j < a.text.length &&
          j < b.text.length &&
          a.text[j] === b.text[j]
        )
          j++;
        if (
          j > 0 &&
          /[\uD800-\uDBFF]/.test(a.text[j - 1]) &&
          /[\uDC00-\uDFFF]/.test(a.text[j])
        )
          j--;
        return pos + j;
      }
      if (!a.isLeaf) {
        const diff = a.content.findDiffStart(b.content, pos + 1);
        if (diff != null) return diff;
      }
      pos += a.nodeSize;
    }
  }
  findDiffEnd(other, aPos = this.size, bPos = other.size) {
    for (let a = this.childCount - 1, b = other.childCount - 1; ; a--, b--) {
      if (a < 0 || b < 0) return a === b ? null : { a: aPos, b: bPos };
      const x = this.child(a),
        y = other.child(b);
      if (x === y) {
        aPos -= x.nodeSize;
        bPos -= y.nodeSize;
        continue;
      }
      if (!x.sameMarkup(y)) return { a: aPos, b: bPos };
      if (x.isText && x.text !== y.text) {
        let n = 0;
        while (
          n < x.text.length &&
          n < y.text.length &&
          x.text[x.text.length - n - 1] === y.text[y.text.length - n - 1]
        )
          n++;
        if (
          n > 0 &&
          /[\uD800-\uDBFF]/.test(x.text[x.text.length - n - 1]) &&
          /[\uDC00-\uDFFF]/.test(x.text[x.text.length - n])
        )
          n--;
        return { a: aPos - n, b: bPos - n };
      }
      if (!x.isLeaf) {
        const diff = x.content.findDiffEnd(y.content, aPos - 1, bPos - 1);
        if (diff) return diff;
      }
      aPos -= x.nodeSize;
      bPos -= y.nodeSize;
    }
  }
  toString() {
    return "<" + this.toStringInner() + ">";
  }
  toStringInner() {
    return this.content.join(", ");
  }
  toJSON() {
    return this.childCount ? this.content.map((n) => n.toJSON()) : null;
  }
  static fromJSON(schema, json) {
    if (!json) return Fragment.empty;
    if (!Array.isArray(json))
      throw new RangeError("Invalid input for Fragment.fromJSON");
    return Fragment.fromArray(json.map(schema.nodeFromJSON));
  }
  static fromArray(array) {
    if (!array.length) return Fragment.empty;
    const out = [];
    for (const n of array) mergePush(out, n);
    return new Fragment(out);
  }
  static from(value) {
    if (!value) return Fragment.empty;
    if (value instanceof Fragment) return value;
    if (Array.isArray(value)) return Fragment.fromArray(value);
    if (value instanceof Node) return new Fragment([value], value.nodeSize);
    throw new RangeError("Can not convert value to a Fragment");
  }
}
Fragment.empty = new Fragment([], 0);
class Node {
  constructor(type, attrs, content, marks = Mark.none) {
    this.type = type;
    this.attrs = attrs;
    this.content = content || Fragment.empty;
    this.marks = marks;
  }
  get children() {
    return this.content.content;
  }
  get nodeSize() {
    return this.isLeaf ? 1 : this.content.size + 2;
  }
  get childCount() {
    return this.content.childCount;
  }
  child(i) {
    return this.content.child(i);
  }
  maybeChild(i) {
    return this.content.maybeChild(i);
  }
  forEach(fn) {
    this.content.forEach(fn);
  }
  nodesBetween(from, to, fn, start = 0) {
    this.content.nodesBetween(from, to, fn, start, this);
  }
  descendants(fn) {
    this.nodesBetween(0, this.content.size, fn);
  }
  get textContent() {
    return this.isLeaf && this.type.spec.leafText
      ? this.type.spec.leafText(this)
      : this.textBetween(0, this.content.size, "");
  }
  textBetween(a, b, sep, leaf) {
    return this.content.textBetween(a, b, sep, leaf);
  }
  get firstChild() {
    return this.content.firstChild;
  }
  get lastChild() {
    return this.content.lastChild;
  }
  eq(other) {
    return (
      this === other ||
      (this.sameMarkup(other) && this.content.eq(other.content))
    );
  }
  sameMarkup(other) {
    return this.hasMarkup(other.type, other.attrs, other.marks);
  }
  hasMarkup(type, attrs, marks) {
    return (
      this.type === type &&
      equal(this.attrs, attrs || type.defaultAttrs || emptyAttrs) &&
      Mark.sameSet(this.marks, marks || Mark.none)
    );
  }
  copy(content = null) {
    return content === this.content
      ? this
      : new Node(this.type, this.attrs, content, this.marks);
  }
  mark(marks) {
    return marks === this.marks
      ? this
      : new Node(this.type, this.attrs, this.content, marks);
  }
  cut(from, to = this.content.size) {
    return from === 0 && to === this.content.size
      ? this
      : this.copy(this.content.cut(from, to));
  }
  slice(from, to = this.content.size, includeParents = false) {
    if (from === to) return Slice.empty;
    const a = this.resolve(from),
      b = this.resolve(to),
      depth = includeParents ? 0 : a.sharedDepth(to),
      start = a.start(depth);
    return new Slice(
      a.node(depth).content.cut(from - start, to - start),
      a.depth - depth,
      b.depth - depth,
    );
  }
  replace(from, to, slice) {
    return replace(this.resolve(from), this.resolve(to), slice);
  }
  nodeAt(pos) {
    let node = this;
    for (;;) {
      const { index, offset } = node.content.findIndex(pos);
      node = node.maybeChild(index);
      if (!node) return null;
      if (offset === pos || node.isText) return node;
      pos -= offset + 1;
    }
  }
  childAfter(pos) {
    const r = this.content.findIndex(pos);
    return { node: this.maybeChild(r.index), index: r.index, offset: r.offset };
  }
  childBefore(pos) {
    if (pos === 0) return { node: null, index: 0, offset: 0 };
    const r = this.content.findIndex(pos);
    if (r.offset < pos)
      return { node: this.child(r.index), index: r.index, offset: r.offset };
    const n = this.child(r.index - 1);
    return { node: n, index: r.index - 1, offset: r.offset - n.nodeSize };
  }
  resolve(pos) {
    return ResolvedPos.resolveCached(this, pos);
  }
  resolveNoCache(pos) {
    return ResolvedPos.resolve(this, pos);
  }
  rangeHasMark(from, to, type) {
    let found = false;
    if (to > from)
      this.nodesBetween(from, to, (n) => {
        if (type.isInSet(n.marks)) found = true;
        return !found;
      });
    return found;
  }
  get isBlock() {
    return this.type.isBlock;
  }
  get isTextblock() {
    return this.type.isTextblock;
  }
  get inlineContent() {
    return this.type.inlineContent;
  }
  get isInline() {
    return this.type.isInline;
  }
  get isText() {
    return this.type.isText;
  }
  get isLeaf() {
    return this.type.isLeaf;
  }
  get isAtom() {
    return this.type.isAtom;
  }
  toString() {
    if (this.type.spec.toDebugString) return this.type.spec.toDebugString(this);
    let out =
      this.type.name +
      (this.content.size ? "(" + this.content.toStringInner() + ")" : "");
    for (let i = this.marks.length - 1; i >= 0; i--)
      out = this.marks[i].type.name + "(" + out + ")";
    return out;
  }
  contentMatchAt(index) {
    const match = this.type.contentMatch.matchFragment(this.content, 0, index);
    if (!match)
      throw new Error("Called contentMatchAt on a node with invalid content");
    return match;
  }
  canReplace(
    from,
    to,
    replacement = Fragment.empty,
    start = 0,
    end = replacement.childCount,
  ) {
    const a = this.contentMatchAt(from).matchFragment(replacement, start, end),
      b = a && a.matchFragment(this.content, to);
    return (
      !!b &&
      b.validEnd &&
      replacement.content
        .slice(start, end)
        .every((n) => this.type.allowsMarks(n.marks))
    );
  }
  canReplaceWith(from, to, type, marks) {
    if (marks && !this.type.allowsMarks(marks)) return false;
    const a = this.contentMatchAt(from).matchType(type),
      b = a && a.matchFragment(this.content, to);
    return !!b && b.validEnd;
  }
  canAppend(other) {
    return other.content.size
      ? this.canReplace(this.childCount, this.childCount, other.content)
      : this.type.compatibleContent(other.type);
  }
  check() {
    this.type.checkContent(this.content);
    this.type.checkAttrs(this.attrs);
    let marks = Mark.none;
    for (const m of this.marks) {
      m.type.checkAttrs(m.attrs);
      marks = m.addToSet(marks);
    }
    if (!Mark.sameSet(marks, this.marks))
      throw new RangeError("Invalid collection of marks");
    this.content.forEach((n) => n.check());
  }
  toJSON() {
    const out = { type: this.type.name };
    if (Object.keys(this.attrs).length) out.attrs = this.attrs;
    if (this.content.size) out.content = this.content.toJSON();
    if (this.marks.length) out.marks = this.marks.map((m) => m.toJSON());
    return out;
  }
  static fromJSON(schema, json) {
    if (!json || typeof json !== "object")
      throw new RangeError("Invalid input for Node.fromJSON");
    if (json.marks != null && !Array.isArray(json.marks))
      throw new RangeError("Invalid mark data for Node.fromJSON");
    const marks = json.marks ? json.marks.map(schema.markFromJSON) : null;
    if (json.type === "text") {
      if (typeof json.text !== "string")
        throw new RangeError("Invalid text node in JSON");
      return schema.text(json.text, marks);
    }
    const type = schema.nodes[json.type];
    if (!type) throw new RangeError("Unknown node type: " + json.type);
    return type.create(
      json.attrs,
      Fragment.fromJSON(schema, json.content),
      marks,
    );
  }
}
class TextNode extends Node {
  constructor(type, attrs, text, marks) {
    super(type, attrs, null, marks);
    if (!text) throw new RangeError("Empty text nodes are not allowed");
    this.text = text;
  }
  get nodeSize() {
    return this.text.length;
  }
  get textContent() {
    return this.text;
  }
  textBetween(from, to) {
    return this.text.slice(from, to);
  }
  withText(text) {
    return text === this.text
      ? this
      : new TextNode(this.type, this.attrs, text, this.marks);
  }
  mark(marks) {
    return marks === this.marks
      ? this
      : new TextNode(this.type, this.attrs, this.text, marks);
  }
  cut(from, to = this.text.length) {
    return this.withText(this.text.slice(from, to));
  }
  eq(other) {
    return this.sameMarkup(other) && this.text === other.text;
  }
  toString() {
    if (this.type.spec.toDebugString) return this.type.spec.toDebugString(this);
    let out = JSON.stringify(this.text);
    for (let i = this.marks.length - 1; i >= 0; i--)
      out = this.marks[i].type.name + "(" + out + ")";
    return out;
  }
  toJSON() {
    const out = super.toJSON();
    out.text = this.text;
    return out;
  }
}
const positions = new WeakMap();
class ResolvedPos {
  constructor(pos, path, parentOffset) {
    this.pos = pos;
    this.path = path;
    this.parentOffset = parentOffset;
    this.depth = path.length / 3 - 1;
  }
  resolveDepth(depth) {
    return depth == null ? this.depth : depth < 0 ? this.depth + depth : depth;
  }
  get parent() {
    return this.node(this.depth);
  }
  get doc() {
    return this.node(0);
  }
  node(depth) {
    return this.path[this.resolveDepth(depth) * 3];
  }
  index(depth) {
    return this.path[this.resolveDepth(depth) * 3 + 1];
  }
  start(depth) {
    depth = this.resolveDepth(depth);
    return depth ? this.path[depth * 3 - 1] + 1 : 0;
  }
  end(depth) {
    depth = this.resolveDepth(depth);
    return this.start(depth) + this.node(depth).content.size;
  }
  before(depth) {
    depth = this.resolveDepth(depth);
    if (!depth)
      throw new RangeError("There is no position before the top-level node");
    return depth === this.depth + 1 ? this.pos : this.path[depth * 3 - 1];
  }
  after(depth) {
    depth = this.resolveDepth(depth);
    if (!depth)
      throw new RangeError("There is no position after the top-level node");
    return depth === this.depth + 1
      ? this.pos
      : this.path[depth * 3 - 1] + this.node(depth).nodeSize;
  }
  get textOffset() {
    return this.pos - this.path.at(-1);
  }
  indexAfter(depth) {
    depth = this.resolveDepth(depth);
    return (
      this.index(depth) + (depth === this.depth && !this.textOffset ? 0 : 1)
    );
  }
  get nodeAfter() {
    const n = this.parent.maybeChild(this.index());
    return n && this.textOffset ? n.cut(this.textOffset) : n;
  }
  get nodeBefore() {
    const offset = this.textOffset;
    return offset
      ? this.parent.child(this.index()).cut(0, offset)
      : this.parent.maybeChild(this.index() - 1);
  }
  posAtIndex(index, depth) {
    depth = this.resolveDepth(depth);
    let pos = this.start(depth);
    for (let i = 0; i < index; i++) pos += this.node(depth).child(i).nodeSize;
    return pos;
  }
  marks() {
    const p = this.parent,
      i = this.index();
    if (!p.content.size) return Mark.none;
    if (this.textOffset) return p.child(i).marks;
    let left = p.maybeChild(i - 1),
      right = p.maybeChild(i);
    if (!left) {
      left = right;
      right = null;
    }
    return left.marks.filter(
      (m) =>
        m.type.spec.inclusive !== false || (right && m.isInSet(right.marks)),
    );
  }
  marksAcross(end) {
    const after = this.parent.maybeChild(this.index());
    if (!after || !after.isInline) return null;
    const next = end.parent.maybeChild(end.index());
    return after.marks.filter(
      (m) => m.type.spec.inclusive !== false || (next && m.isInSet(next.marks)),
    );
  }
  sharedDepth(pos) {
    for (let d = this.depth; d > 0; d--)
      if (this.start(d) <= pos && this.end(d) >= pos) return d;
    return 0;
  }
  sameParent(other) {
    return this.pos - this.parentOffset === other.pos - other.parentOffset;
  }
  max(other) {
    return this.pos > other.pos ? this : other;
  }
  min(other) {
    return this.pos < other.pos ? this : other;
  }
  blockRange(other = this, pred) {
    if (other.pos < this.pos) return other.blockRange(this, pred);
    for (
      let d =
        this.depth -
        (this.parent.inlineContent || this.pos === other.pos ? 1 : 0);
      d >= 0;
      d--
    )
      if (other.pos <= this.end(d) && (!pred || pred(this.node(d))))
        return new NodeRange(this, other, d);
    return null;
  }
  toString() {
    let path = "";
    for (let d = 1; d <= this.depth; d++)
      path +=
        (path ? "/" : "") + this.node(d).type.name + "_" + this.index(d - 1);
    return path + ":" + this.parentOffset;
  }
  static resolve(doc, pos) {
    if (!Number.isInteger(pos) || pos < 0 || pos > doc.content.size)
      throw new RangeError("Position " + pos + " out of range");
    const path = [];
    let node = doc,
      start = 0,
      offset = pos;
    for (;;) {
      const found = node.content.findIndex(offset);
      path.push(node, found.index, start + found.offset);
      const rest = offset - found.offset;
      if (!rest) break;
      node = node.child(found.index);
      if (node.isText) break;
      offset = rest - 1;
      start += found.offset + 1;
    }
    return new ResolvedPos(pos, path, offset);
  }
  static resolveCached(doc, pos) {
    let cache = positions.get(doc);
    if (!cache) {
      cache = new Map();
      positions.set(doc, cache);
    }
    let value = cache.get(pos);
    if (!value) {
      value = ResolvedPos.resolve(doc, pos);
      if (cache.size >= 12) cache.delete(cache.keys().next().value);
      cache.set(pos, value);
    }
    return value;
  }
}
class NodeRange {
  constructor(from, to, depth) {
    this.$from = from;
    this.$to = to;
    this.depth = depth;
  }
  get start() {
    return this.$from.before(this.depth + 1);
  }
  get end() {
    return this.$to.after(this.depth + 1);
  }
  get parent() {
    return this.$from.node(this.depth);
  }
  get startIndex() {
    return this.$from.index(this.depth);
  }
  get endIndex() {
    return this.$to.indexAfter(this.depth);
  }
}
class ReplaceError extends Error {
  constructor(message) {
    super(message);
    this.name = "ReplaceError";
  }
}
// Emit a range as complete subtrees plus only the open/close boundaries crossed
// by the edit. Unchanged subtrees are retained without flattening their content.
function tokens(fragment, from, to, out) {
  let pos = 0;
  for (const n of fragment.content) {
    const end = pos + n.nodeSize;
    if (end > from && pos < to) {
      if (from <= pos && to >= end) out.push({ node: n });
      else if (n.isText)
        out.push({
          node: n.cut(Math.max(0, from - pos), Math.min(n.nodeSize, to - pos)),
        });
      else {
        if (from <= pos) out.push({ open: n });
        tokens(
          n.content,
          Math.max(0, from - pos - 1),
          Math.min(n.content.size, to - pos - 1),
          out,
        );
        if (to >= end) out.push({ close: n });
      }
    }
    pos = end;
    if (pos >= to) break;
  }
}
function replace(a, b, slice) {
  if (slice.openStart > a.depth)
    throw new ReplaceError("Inserted content deeper than insertion position");
  if (a.depth - slice.openStart !== b.depth - slice.openEnd)
    throw new ReplaceError("Inconsistent open depths");
  const depth = Math.min(a.sharedDepth(b.pos), a.depth - slice.openStart),
    parent = a.node(depth),
    start = a.start(depth),
    stream = [];
  tokens(parent.content, 0, a.pos - start, stream);
  tokens(
    slice.content,
    slice.openStart,
    slice.content.size - slice.openEnd,
    stream,
  );
  tokens(parent.content, b.pos - start, parent.content.size, stream);
  const stack = [{ node: parent, children: [] }];
  for (const t of stream) {
    if (t.node) mergePush(stack.at(-1).children, t.node);
    else if (t.open) stack.push({ node: t.open, children: [] });
    else {
      if (stack.length < 2) throw new ReplaceError("Inconsistent open depths");
      const frame = stack.pop();
      if (!frame.node.type.compatibleContent(t.close.type))
        throw new ReplaceError(
          "Cannot join " + t.close.type.name + " onto " + frame.node.type.name,
        );
      const content = new Fragment(frame.children);
      if (!frame.node.type.validContent(content))
        throw new ReplaceError(
          "Invalid content for node " + frame.node.type.name,
        );
      mergePush(stack.at(-1).children, frame.node.copy(content));
    }
  }
  if (stack.length !== 1) throw new ReplaceError("Inconsistent open depths");
  const content = new Fragment(stack[0].children);
  if (!parent.type.validContent(content))
    throw new ReplaceError("Invalid content for node " + parent.type.name);
  let result = parent.copy(content);
  for (let d = depth - 1; d >= 0; d--)
    result = a.node(d).copy(a.node(d).content.replaceChild(a.index(d), result));
  return result;
}
function insertFragment(fragment, pos, insert, parent) {
  const { index, offset } = fragment.findIndex(pos),
    child = fragment.maybeChild(index);
  if (offset === pos || child?.isText) {
    if (parent && !parent.canReplace(index, index, insert)) return null;
    return fragment.cut(0, pos).append(insert).append(fragment.cut(pos));
  }
  const inner = insertFragment(child.content, pos - offset - 1, insert, child);
  return inner && fragment.replaceChild(index, child.copy(inner));
}
function removeFragment(fragment, from, to) {
  const a = fragment.findIndex(from),
    b = fragment.findIndex(to),
    child = fragment.maybeChild(a.index);
  if (a.offset === from || child?.isText) {
    if (b.offset !== to && !fragment.child(b.index).isText)
      throw new RangeError("Removing non-flat range");
    return fragment.cut(0, from).append(fragment.cut(to));
  }
  if (a.index !== b.index) throw new RangeError("Removing non-flat range");
  return fragment.replaceChild(
    a.index,
    child.copy(
      removeFragment(child.content, from - a.offset - 1, to - a.offset - 1),
    ),
  );
}
class Slice {
  constructor(content, openStart, openEnd) {
    this.content = content;
    this.openStart = openStart;
    this.openEnd = openEnd;
  }
  get size() {
    return this.content.size - this.openStart - this.openEnd;
  }
  eq(other) {
    return (
      this.openStart === other.openStart &&
      this.openEnd === other.openEnd &&
      this.content.eq(other.content)
    );
  }
  insertAt(pos, fragment) {
    const content = insertFragment(
      this.content,
      pos + this.openStart,
      fragment,
    );
    return content ? new Slice(content, this.openStart, this.openEnd) : null;
  }
  removeBetween(from, to) {
    return new Slice(
      removeFragment(this.content, from + this.openStart, to + this.openStart),
      this.openStart,
      this.openEnd,
    );
  }
  toString() {
    return this.content + "(" + this.openStart + "," + this.openEnd + ")";
  }
  toJSON() {
    if (!this.content.size) return null;
    const out = { content: this.content.toJSON() };
    if (this.openStart) out.openStart = this.openStart;
    if (this.openEnd) out.openEnd = this.openEnd;
    return out;
  }
  static fromJSON(schema, json) {
    if (!json) return Slice.empty;
    const a = json.openStart === undefined ? 0 : json.openStart,
      b = json.openEnd === undefined ? 0 : json.openEnd;
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0)
      throw new RangeError("Invalid input for Slice.fromJSON");
    return new Slice(Fragment.fromJSON(schema, json.content), a, b);
  }
  static maxOpen(fragment, openIsolating = true) {
    let a = 0,
      b = 0;
    for (
      let n = fragment.firstChild;
      n && !n.isLeaf && (openIsolating || !n.type.spec.isolating);
      n = n.firstChild
    )
      a++;
    for (
      let n = fragment.lastChild;
      n && !n.isLeaf && (openIsolating || !n.type.spec.isolating);
      n = n.lastChild
    )
      b++;
    return new Slice(fragment, a, b);
  }
}
Slice.empty = new Slice(Fragment.empty, 0, 0);
module.exports = {
  Node,
  TextNode,
  Fragment,
  Mark,
  ResolvedPos,
  NodeRange,
  Slice,
  ReplaceError,
  equal,
  emptyAttrs,
};
