"use strict";

// The model keeps document-relative indexes. Mapping first produces absolute
// ranges, then partitions them against the new document. This deliberately
// avoids carrying partially mapped child offsets through a compound change.
const none = Object.freeze({});
const order = (a, b) => a.from - b.from || a.to - b.to;
function shallow(a, b) {
  if (a === b) return true;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => Object.hasOwn(b, key) && a[key] === b[key])
  );
}

// Model nodes are immutable. Cache only child boundaries by node identity, never
// decoration membership or mapping results; a changed document gets a new index.
const childIndexes = new WeakMap();
function childAt(doc, position) {
  if (position < 0 || position >= doc.content.size) return null;
  let children = childIndexes.get(doc);
  if (!children) {
    children = [];
    doc.forEach((node, offset, index) =>
      children.push({ node, offset, index }),
    );
    childIndexes.set(doc, children);
  }
  let lo = 0,
    hi = children.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (children[mid].offset <= position) lo = mid + 1;
    else hi = mid;
  }
  return children[lo - 1] || null;
}

class Descriptor {
  constructor(kind, attrs, spec, toDOM) {
    this.kind = kind;
    this.attrs = attrs;
    this.spec = spec || none;
    if (kind === "widget") {
      this.toDOM = toDOM;
      this.side = this.spec.side || 0;
    }
  }
  eq(other) {
    if (this === other) return true;
    if (!other || this.kind !== other.kind) return false;
    if (this.kind === "widget")
      return (
        !!(this.spec.key && this.spec.key === other.spec.key) ||
        (this.toDOM === other.toDOM && shallow(this.spec, other.spec))
      );
    return shallow(this.attrs, other.attrs) && shallow(this.spec, other.spec);
  }
  valid(node, deco) {
    if (this.kind === "widget") return true;
    if (this.kind === "inline") return deco.from < deco.to;
    if (deco.from < 0 || deco.to > node.content.size) return false;
    const found = node.content.findIndex(deco.from);
    const child = node.maybeChild(found.index);
    return (
      !!child &&
      !child.isText &&
      found.offset === deco.from &&
      deco.to === deco.from + child.nodeSize
    );
  }
  map(mapping, deco, offset, oldOffset) {
    if (this.kind === "widget") {
      const point = mapping.mapResult(
        deco.from + oldOffset,
        this.side < 0 ? -1 : 1,
      );
      return point.deleted
        ? null
        : deco.copy(point.pos - offset, point.pos - offset);
    }
    if (this.kind === "inline") {
      const from =
        mapping.map(deco.from + oldOffset, this.spec.inclusiveStart ? -1 : 1) -
        offset;
      const to =
        mapping.map(deco.to + oldOffset, this.spec.inclusiveEnd ? 1 : -1) -
        offset;
      return from < to ? deco.copy(from, to) : null;
    }
    const from = mapping.mapResult(deco.from + oldOffset, 1);
    const to = mapping.mapResult(deco.to + oldOffset, -1);
    return from.deleted || to.deleted || from.pos >= to.pos
      ? null
      : deco.copy(from.pos - offset, to.pos - offset);
  }
  destroy(node) {
    if (this.spec.destroy) this.spec.destroy(node);
  }
}

class Decoration {
  constructor(from, to, type) {
    this.from = from;
    this.to = to;
    this.type = type;
  }
  static widget(pos, toDOM, spec) {
    return new Decoration(
      pos,
      pos,
      new Descriptor("widget", null, spec, toDOM),
    );
  }
  static inline(from, to, attrs, spec) {
    return new Decoration(from, to, new Descriptor("inline", attrs, spec));
  }
  static node(from, to, attrs, spec) {
    return new Decoration(from, to, new Descriptor("node", attrs, spec));
  }
  get spec() {
    return this.type.spec;
  }
  get inline() {
    return this.type.kind === "inline";
  }
  get widget() {
    return this.type.kind === "widget";
  }
  copy(from, to) {
    return new Decoration(from, to, this.type);
  }
  eq(other, offset = 0) {
    return (
      this.from + offset === other.from &&
      this.to + offset === other.to &&
      this.type.eq(other.type)
    );
  }
  map(mapping, offset = 0, oldOffset = 0) {
    return this.type.map(mapping, this, offset, oldOffset);
  }
}

// Normalize crossing ranges into equal or disjoint segments. Preserve ordering
// of equal spans so attribute precedence does not change during normalization.
function splitOverlaps(decorations) {
  let result = decorations;
  const insert = (deco, after) => {
    let at = after;
    while (at < result.length && order(result[at], deco) < 0) at++;
    result.splice(at, 0, deco);
  };
  for (let i = 0; i < result.length; i++) {
    const left = result[i];
    if (left.from === left.to) continue;
    for (let j = i + 1; j < result.length; j++) {
      const right = result[j];
      if (right.from >= left.to) break;
      if (right.from === left.from) {
        if (right.to <= left.to) continue;
        if (result === decorations) result = decorations.slice();
        result[j] = right.copy(right.from, left.to);
        insert(right.copy(left.to, right.to), j + 1);
      } else {
        if (result === decorations) result = decorations.slice();
        result[i] = left.copy(left.from, right.from);
        insert(left.copy(right.from, left.to), j);
        break;
      }
    }
  }
  return result;
}

function firstChild(children, start) {
  let lo = 0,
    hi = children.length / 3;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (children[mid * 3 + 1] < start) lo = mid + 1;
    else hi = mid;
  }
  return lo * 3;
}
// Reuse only intervals untouched at every individual step. Checking solely the
// final node identity would miss edits followed by an inverse or custom map.
function untouched(mapping, from, to) {
  for (let i = mapping.from; i < mapping.to; i++) {
    const step = mapping.maps[i];
    let touched = false;
    step.forEach((start, end) => {
      if (start < to && end > from) touched = true;
    });
    if (touched) return null;
    from = step.map(from, 1);
    to = step.map(to, -1);
  }
  return { from, to };
}

class DecorationSet {
  #doc;
  constructor(local, children, doc) {
    this.local = local;
    this.children = children;
    this.#doc = doc;
  }
  static create(doc, decorations) {
    return partition(doc, decorations);
  }
  find(start = 0, end = Infinity, predicate) {
    const result = [];
    const visit = (set, base) => {
      for (const d of set.local)
        if (
          d.from + base <= end &&
          d.to + base >= start &&
          (!predicate || predicate(d.spec))
        )
          result.push(d.copy(d.from + base, d.to + base));
      for (
        let i = firstChild(set.children, start - base);
        i < set.children.length;
        i += 3
      ) {
        const from = set.children[i],
          to = set.children[i + 1],
          child = set.children[i + 2];
        if (base + from > end) break;
        if (base + from <= end && base + to >= start)
          visit(child, base + from + 1);
      }
    };
    visit(this, 0);
    return result;
  }
  map(mapping, doc, options = none) {
    if (this === DecorationSet.empty || !mapping.maps.length) return this;
    const mapped = [],
      stable = [],
      affected = [];
    const mapRange = (d, base = 0) => {
      const next = d.map(mapping, 0, base);
      if (next) mapped.push(next);
      else options.onRemove?.(d.spec);
    };
    for (const d of this.local) mapRange(d);
    for (let i = 0; i < this.children.length; i += 3) {
      const from = this.children[i],
        to = this.children[i + 1],
        child = this.children[i + 2];
      const intact = untouched(mapping, from, to);
      const candidate = intact && childAt(doc, intact.from);
      if (
        candidate &&
        candidate.offset === intact.from &&
        candidate.node === child.#doc &&
        intact.to - intact.from === to - from
      ) {
        stable.push(intact.from, intact.to, child);
      } else {
        affected.push(child);
        for (const d of child.find()) mapRange(d, from + 1);
      }
    }
    const reuse = new WeakMap();
    for (const child of affected) child.#reuseIndex(reuse);
    const changed = partition(doc, mapped, reuse, options.onRemove);
    const kept = stable.length
      ? new DecorationSet([], stable, doc)
      : DecorationSet.empty;
    return DecorationSet.#union(kept, changed, doc);
  }
  add(doc, decorations) {
    return decorations.length
      ? DecorationSet.#union(this, partition(doc, decorations), doc)
      : this;
  }
  static #union(a, b, doc) {
    if (a === DecorationSet.empty) return b;
    if (b === DecorationSet.empty) return a;
    const children = [];
    let i = 0,
      j = 0;
    while (i < a.children.length || j < b.children.length) {
      if (
        j === b.children.length ||
        (i < a.children.length && a.children[i] < b.children[j])
      ) {
        children.push(a.children[i], a.children[i + 1], a.children[i + 2]);
        i += 3;
      } else if (i === a.children.length || b.children[j] < a.children[i]) {
        children.push(b.children[j], b.children[j + 1], b.children[j + 2]);
        j += 3;
      } else {
        const child = b.children[j + 2];
        children.push(
          b.children[j],
          b.children[j + 1],
          DecorationSet.#union(a.children[i + 2], child, child.#doc),
        );
        i += 3;
        j += 3;
      }
    }
    return new DecorationSet(
      a.local.concat(b.local).sort(order),
      children,
      doc,
    );
  }
  remove(decorations) {
    if (!decorations.length || this === DecorationSet.empty) return this;
    if (decorations.length === 1) {
      const item = decorations[0];
      const removeOne = (set, base) => {
        let local = set.local,
          children = set.children;
        if (local.some((d) => d.eq(item, base)))
          local = local.filter((d) => !d.eq(item, base));
        const at = firstChild(children, item.from - base);
        if (
          at < children.length &&
          item.from > base + children[at] &&
          item.to < base + children[at + 1]
        ) {
          const old = children[at + 2],
            next = removeOne(old, base + children[at] + 1);
          if (old !== next) {
            children = children.slice();
            if (next === DecorationSet.empty) children.splice(at, 3);
            else children[at + 2] = next;
          }
        }
        return local === set.local && children === set.children
          ? set
          : !local.length && !children.length
            ? DecorationSet.empty
            : new DecorationSet(local, children, set.#doc);
      };
      return removeOne(this, 0);
    }
    const removeAt = (set, base) => {
      const local = set.local.filter(
        (d) => !decorations.some((other) => d.eq(other, base)),
      );
      const children = [];
      let changed = local.length !== set.local.length;
      for (let i = 0; i < set.children.length; i += 3) {
        const from = set.children[i],
          to = set.children[i + 1],
          old = set.children[i + 2];
        const relevant = decorations.some(
          (d) => d.from > base + from && d.to < base + to,
        );
        const next = relevant ? removeAt(old, base + from + 1) : old;
        if (next !== old) changed = true;
        if (next !== DecorationSet.empty) children.push(from, to, next);
      }
      return !changed
        ? set
        : !local.length && !children.length
          ? DecorationSet.empty
          : new DecorationSet(local, children, set.#doc);
    };
    return removeAt(this, 0);
  }
  forChild(offset, node) {
    if (node.isLeaf || this === DecorationSet.empty) return DecorationSet.empty;
    let child = DecorationSet.empty;
    for (let i = 0; i < this.children.length; i += 3)
      if (this.children[i] === offset) {
        child = this.children[i + 2];
        break;
      }
    const inherited = [];
    const start = offset + 1,
      end = start + node.content.size;
    for (const d of this.local)
      if (d.inline && d.from < end && d.to > start)
        inherited.push(
          d.copy(Math.max(start, d.from) - start, Math.min(end, d.to) - start),
        );
    // Clipped parent ranges are local to this child, not recursively reassigned.
    if (!inherited.length) return child;
    return combine([new DecorationSet(inherited.sort(order), [], node), child]);
  }
  locals(node) {
    const locals = node.inlineContent
      ? this.local
      : this.local.filter((d) => !d.inline);
    return splitOverlaps(locals);
  }
  eq(other) {
    return (
      this === other ||
      (other instanceof DecorationSet &&
        this.local.length === other.local.length &&
        this.children.length === other.children.length &&
        this.local.every((d, i) => d.eq(other.local[i])) &&
        this.children.every((c, i) =>
          i % 3 === 2 ? c.eq(other.children[i]) : c === other.children[i],
        ))
    );
  }
  forEachSet(fn) {
    fn(this);
  }
  static removeOverlap = splitOverlaps;
  #reuseIndex(index = new WeakMap()) {
    const visit = (current) => {
      if (current.#doc) {
        const candidates = index.get(current.#doc) || [];
        candidates.push(current);
        index.set(current.#doc, candidates);
      }
      for (let i = 2; i < current.children.length; i += 3)
        visit(current.children[i]);
    };
    visit(this);
    return index;
  }
}

function partition(doc, decorations, reuse, onRemove) {
  if (!decorations.length) return DecorationSet.empty;
  const local = [],
    groups = new Map();
  for (const d of decorations) {
    // Find the single child that could own the whole range. A boundary widget
    // and a decoration of the node itself stay with its parent.
    const found = childAt(doc, d.from);
    const child = found && found.node;
    if (
      child &&
      !child.isLeaf &&
      d.from > found.offset &&
      d.to < found.offset + child.nodeSize
    ) {
      let group = groups.get(found.index);
      if (!group)
        groups.set(
          found.index,
          (group = { child, offset: found.offset, ranges: [] }),
        );
      group.ranges.push(
        d.copy(d.from - found.offset - 1, d.to - found.offset - 1),
      );
    } else if (d.type.valid(doc, d)) local.push(d);
    else onRemove?.(d.spec);
  }
  const children = [];
  for (const [, group] of [...groups].sort((a, b) => a[0] - b[0])) {
    const sub = partition(group.child, group.ranges, reuse, onRemove);
    if (sub !== DecorationSet.empty)
      children.push(group.offset, group.offset + group.child.nodeSize, sub);
  }
  if (!local.length && !children.length) return DecorationSet.empty;
  const next = new DecorationSet(local.sort(order), children, doc);
  return reuse?.get(doc)?.find((old) => old.eq(next)) || next;
}

// Child projections may combine a clipped parent layer and an indexed child
// layer. Retain those layers for DecorationSource.forEachSet consumers.
function combine(sources) {
  const members = [];
  for (const source of sources)
    source.forEachSet((set) => {
      if (set !== DecorationSet.empty) members.push(set);
    });
  return members.length === 0
    ? DecorationSet.empty
    : members.length === 1
      ? members[0]
      : new Layers(members);
}
class Layers {
  constructor(members) {
    this.members = members;
  }
  forEachSet(fn) {
    for (const member of this.members) fn(member);
  }
  forChild(offset, node) {
    return combine(this.members.map((set) => set.forChild(offset, node)));
  }
  map(mapping, doc) {
    return combine(this.members.map((set) => set.map(mapping, doc)));
  }
  locals(node) {
    return splitOverlaps(
      this.members
        .flatMap((set) =>
          node.inlineContent ? set.local : set.local.filter((d) => !d.inline),
        )
        .sort(order),
    );
  }
  eq(other) {
    return (
      other instanceof Layers &&
      other.members.length === this.members.length &&
      this.members.every((set, i) => set.eq(other.members[i]))
    );
  }
}

DecorationSet.empty = new DecorationSet([], [], null);
module.exports = { Decoration, DecorationSet };
