"use strict";
const { Fragment, Slice, ReplaceError } = require("vprosemirror-model");
const { StepMap } = require("./mapping.cjs");
const registry = new Map();
const position = (value) => {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError("Invalid step position");
  return value;
};
class Step {
  getMap() {
    return StepMap.empty;
  }
  merge() {
    return null;
  }
  static fromJSON(schema, json) {
    if (
      !json ||
      typeof json.stepType !== "string" ||
      !registry.has(json.stepType)
    )
      throw new RangeError("Unknown step type");
    return registry.get(json.stepType).fromJSON(schema, json);
  }
  static jsonID(id, type) {
    if (registry.has(id)) throw new RangeError("Duplicate step type: " + id);
    registry.set(id, type);
    type.prototype.jsonID = id;
    return type;
  }
}
class StepResult {
  constructor(doc, failed) {
    this.doc = doc;
    this.failed = failed;
  }
  static ok(doc) {
    return new StepResult(doc, null);
  }
  static fail(message) {
    return new StepResult(null, message);
  }
  static fromReplace(doc, from, to, slice) {
    try {
      return StepResult.ok(doc.replace(from, to, slice));
    } catch (e) {
      if (e instanceof ReplaceError) return StepResult.fail(e.message);
      throw e;
    }
  }
}
function contentBetween(doc, from, to) {
  if (from === to) return false;
  let real = false;
  doc.nodesBetween(from, to, (node, pos) => {
    if (node.isLeaf || (pos >= from && pos + node.nodeSize <= to)) {
      real = true;
      return false;
    }
  });
  return real;
}
class ReplaceStep extends Step {
  constructor(from, to, slice, structure = false) {
    super();
    this.from = from;
    this.to = to;
    this.slice = slice;
    this.structure = structure;
  }
  apply(doc) {
    if (this.structure && contentBetween(doc, this.from, this.to))
      return StepResult.fail("Structure replace would overwrite content");
    return StepResult.fromReplace(doc, this.from, this.to, this.slice);
  }
  getMap() {
    return new StepMap([this.from, this.to - this.from, this.slice.size]);
  }
  invert(doc) {
    return new ReplaceStep(
      this.from,
      this.from + this.slice.size,
      doc.slice(this.from, this.to),
    );
  }
  map(mapping) {
    const a = mapping.mapResult(this.from, 1),
      b = mapping.mapResult(this.to, -1);
    return a.deletedAcross && b.deletedAcross
      ? null
      : new ReplaceStep(
          a.pos,
          Math.max(a.pos, b.pos),
          this.slice,
          this.structure,
        );
  }
  merge(other) {
    if (!(other instanceof ReplaceStep) || this.structure || other.structure)
      return null;
    if (
      this.from + this.slice.size === other.from &&
      !this.slice.openEnd &&
      !other.slice.openStart
    )
      return new ReplaceStep(
        this.from,
        this.to + other.to - other.from,
        new Slice(
          this.slice.content.append(other.slice.content),
          this.slice.openStart,
          other.slice.openEnd,
        ),
      );
    if (other.to === this.from && !this.slice.openStart && !other.slice.openEnd)
      return new ReplaceStep(
        other.from,
        this.to,
        new Slice(
          other.slice.content.append(this.slice.content),
          other.slice.openStart,
          this.slice.openEnd,
        ),
      );
    return null;
  }
  toJSON() {
    const out = { stepType: this.jsonID, from: this.from, to: this.to };
    if (this.slice.size) out.slice = this.slice.toJSON();
    if (this.structure) out.structure = true;
    return out;
  }
  static fromJSON(s, j) {
    return new ReplaceStep(
      position(j.from),
      position(j.to),
      Slice.fromJSON(s, j.slice),
      !!j.structure,
    );
  }
}
class ReplaceAroundStep extends Step {
  constructor(from, to, gapFrom, gapTo, slice, insert, structure = false) {
    super();
    Object.assign(this, { from, to, gapFrom, gapTo, slice, insert, structure });
  }
  apply(doc) {
    if (
      this.structure &&
      (contentBetween(doc, this.from, this.gapFrom) ||
        contentBetween(doc, this.gapTo, this.to))
    )
      return StepResult.fail("Structure gap-replace would overwrite content");
    const gap = doc.slice(this.gapFrom, this.gapTo);
    if (gap.openStart || gap.openEnd)
      return StepResult.fail("Gap is not a flat range");
    const inserted = gap.content.size
      ? this.slice.insertAt(this.insert, gap.content)
      : this.slice;
    return inserted
      ? StepResult.fromReplace(doc, this.from, this.to, inserted)
      : StepResult.fail("Content does not fit in gap");
  }
  getMap() {
    return new StepMap([
      this.from,
      this.gapFrom - this.from,
      this.insert,
      this.gapTo,
      this.to - this.gapTo,
      this.slice.size - this.insert,
    ]);
  }
  invert(doc) {
    const gap = this.gapTo - this.gapFrom;
    return new ReplaceAroundStep(
      this.from,
      this.from + this.slice.size + gap,
      this.from + this.insert,
      this.from + this.insert + gap,
      doc
        .slice(this.from, this.to)
        .removeBetween(this.gapFrom - this.from, this.gapTo - this.from),
      this.gapFrom - this.from,
      this.structure,
    );
  }
  map(m) {
    const a = m.mapResult(this.from, 1),
      b = m.mapResult(this.to, -1),
      g1 = this.gapFrom === this.from ? a.pos : m.map(this.gapFrom, -1),
      g2 = this.gapTo === this.to ? b.pos : m.map(this.gapTo, 1);
    return (a.deletedAcross && b.deletedAcross) ||
      a.pos > b.pos ||
      g1 < a.pos ||
      g2 > b.pos
      ? null
      : new ReplaceAroundStep(
          a.pos,
          b.pos,
          g1,
          g2,
          this.slice,
          this.insert,
          this.structure,
        );
  }
  toJSON() {
    const out = {
      stepType: this.jsonID,
      from: this.from,
      to: this.to,
      gapFrom: this.gapFrom,
      gapTo: this.gapTo,
      insert: this.insert,
    };
    if (this.slice.size) out.slice = this.slice.toJSON();
    if (this.structure) out.structure = true;
    return out;
  }
  static fromJSON(s, j) {
    return new ReplaceAroundStep(
      position(j.from),
      position(j.to),
      position(j.gapFrom),
      position(j.gapTo),
      Slice.fromJSON(s, j.slice),
      position(j.insert),
      !!j.structure,
    );
  }
}
function appendMark(steps, step) {
  for (let i = steps.length - 1; i >= 0; i--) {
    const merged = steps[i].merge(step);
    if (merged) {
      steps[i] = merged;
      return;
    }
  }
  steps.push(step);
}
class MarkSetStep extends Step {
  constructor(steps) {
    super();
    this.steps = steps;
  }
  apply(doc) {
    for (const step of this.steps) {
      const result = step.apply(doc);
      if (result.failed) return result;
      doc = result.doc;
    }
    return StepResult.ok(doc);
  }
  invert(doc) {
    const steps = [];
    for (const step of this.steps) {
      steps.unshift(step.invert(doc));
      doc = step.apply(doc).doc;
    }
    return new MarkSetStep(steps);
  }
  map(m) {
    return new MarkSetStep(this.steps.map((s) => s.map(m)).filter(Boolean));
  }
  toJSON() {
    return { stepType: "markSet", steps: this.steps.map((s) => s.toJSON()) };
  }
  static fromJSON(s, j) {
    if (!Array.isArray(j.steps)) throw new RangeError("Invalid mark set");
    const steps = j.steps.map((v) => Step.fromJSON(s, v));
    if (steps.some((v) => !(v instanceof MarkStep)))
      throw new RangeError("Invalid mark set member");
    return new MarkSetStep(steps);
  }
}
Step.jsonID("markSet", MarkSetStep);
function mapMarks(fragment, fn, parent) {
  const out = [];
  fragment.forEach((n) => {
    let copy = n;
    if (n.content.size) copy = n.copy(mapMarks(n.content, fn, n));
    out.push(n.isInline ? fn(copy, parent) : copy);
  });
  return Fragment.from(out);
}
class MarkStep extends Step {
  constructor(from, to, mark) {
    super();
    Object.assign(this, { from, to, mark });
  }
  apply(doc) {
    const slice = doc.slice(this.from, this.to),
      parent = doc
        .resolve(this.from)
        .node(doc.resolve(this.from).sharedDepth(this.to));
    const content = mapMarks(
      slice.content,
      (n, p) =>
        n.mark(
          this.add && p.type.allowsMarkType(this.mark.type)
            ? this.mark.addToSet(n.marks)
            : this.add
              ? n.marks
              : this.mark.removeFromSet(n.marks),
        ),
      parent,
    );
    return StepResult.fromReplace(
      doc,
      this.from,
      this.to,
      new Slice(content, slice.openStart, slice.openEnd),
    );
  }
  invert(doc) {
    const undo = [];
    doc.nodesBetween(this.from, this.to, (n, pos, parent) => {
      if (!n.isInline) return;
      const after =
        this.add && parent.type.allowsMarkType(this.mark.type)
          ? this.mark.addToSet(n.marks)
          : this.add
            ? n.marks
            : this.mark.removeFromSet(n.marks);
      const a = Math.max(this.from, pos),
        b = Math.min(this.to, pos + n.nodeSize);
      for (const m of after)
        if (!m.isInSet(n.marks)) appendMark(undo, new RemoveMarkStep(a, b, m));
      for (const m of n.marks)
        if (!m.isInSet(after)) appendMark(undo, new AddMarkStep(a, b, m));
    });
    return undo.length === 1 ? undo[0] : new MarkSetStep(undo);
  }
  map(m) {
    const a = m.mapResult(this.from, 1),
      b = m.mapResult(this.to, -1);
    return (a.deleted && b.deleted) || a.pos >= b.pos
      ? null
      : new this.constructor(a.pos, b.pos, this.mark);
  }
  merge(other) {
    return other.constructor === this.constructor &&
      other.mark.eq(this.mark) &&
      this.from <= other.to &&
      this.to >= other.from
      ? new this.constructor(
          Math.min(this.from, other.from),
          Math.max(this.to, other.to),
          this.mark,
        )
      : null;
  }
  toJSON() {
    return {
      stepType: this.jsonID,
      mark: this.mark.toJSON(),
      from: this.from,
      to: this.to,
    };
  }
  static fromJSON(s, j) {
    return new this(position(j.from), position(j.to), s.markFromJSON(j.mark));
  }
}
class AddMarkStep extends MarkStep {
  get add() {
    return true;
  }
}
class RemoveMarkStep extends MarkStep {
  get add() {
    return false;
  }
}
function changeNode(doc, pos, fn) {
  const n = doc.nodeAt(pos);
  if (!n) return StepResult.fail("No node at mark or attribute step position");
  const copy = fn(n);
  return StepResult.fromReplace(
    doc,
    pos,
    pos + 1,
    new Slice(Fragment.from(copy), 0, n.isLeaf ? 0 : 1),
  );
}
class NodeMarkStep extends Step {
  constructor(pos, mark) {
    super();
    this.pos = pos;
    this.mark = mark;
  }
  apply(doc) {
    return changeNode(doc, this.pos, (n) =>
      n.type.create(
        n.attrs,
        null,
        this.add
          ? this.mark.addToSet(n.marks)
          : this.mark.removeFromSet(n.marks),
      ),
    );
  }
  invert(doc) {
    const n = doc.nodeAt(this.pos);
    if (!n) return this;
    const old = n.marks;
    if (this.add) {
      const next = this.mark.addToSet(old);
      for (const m of old)
        if (!m.isInSet(next)) return new AddNodeMarkStep(this.pos, m);
      return this.mark.isInSet(old)
        ? new AddNodeMarkStep(this.pos, this.mark)
        : new RemoveNodeMarkStep(this.pos, this.mark);
    }
    return this.mark.isInSet(old)
      ? new AddNodeMarkStep(this.pos, this.mark)
      : this;
  }
  map(m) {
    const r = m.mapResult(this.pos, 1);
    return r.deletedAfter ? null : new this.constructor(r.pos, this.mark);
  }
  toJSON() {
    return { stepType: this.jsonID, pos: this.pos, mark: this.mark.toJSON() };
  }
  static fromJSON(s, j) {
    return new this(position(j.pos), s.markFromJSON(j.mark));
  }
}
class AddNodeMarkStep extends NodeMarkStep {
  get add() {
    return true;
  }
}
class RemoveNodeMarkStep extends NodeMarkStep {
  get add() {
    return false;
  }
}
class AttrStep extends Step {
  constructor(pos, attr, value) {
    super();
    Object.assign(this, { pos, attr, value });
  }
  apply(doc) {
    return changeNode(doc, this.pos, (n) =>
      n.type.create({ ...n.attrs, [this.attr]: this.value }, null, n.marks),
    );
  }
  invert(doc) {
    return new AttrStep(
      this.pos,
      this.attr,
      doc.nodeAt(this.pos).attrs[this.attr],
    );
  }
  map(m) {
    const r = m.mapResult(this.pos, 1);
    return r.deletedAfter ? null : new AttrStep(r.pos, this.attr, this.value);
  }
  toJSON() {
    return {
      stepType: this.jsonID,
      pos: this.pos,
      attr: this.attr,
      value: this.value,
    };
  }
  static fromJSON(_s, j) {
    if (typeof j.attr !== "string") throw new RangeError("Invalid attribute");
    return new AttrStep(position(j.pos), j.attr, j.value);
  }
}
class DocAttrStep extends Step {
  constructor(attr, value) {
    super();
    this.attr = attr;
    this.value = value;
  }
  apply(doc) {
    return StepResult.ok(
      doc.type.create(
        { ...doc.attrs, [this.attr]: this.value },
        doc.content,
        doc.marks,
      ),
    );
  }
  invert(doc) {
    return new DocAttrStep(this.attr, doc.attrs[this.attr]);
  }
  map() {
    return this;
  }
  toJSON() {
    return { stepType: this.jsonID, attr: this.attr, value: this.value };
  }
  static fromJSON(_s, j) {
    if (typeof j.attr !== "string") throw new RangeError("Invalid attribute");
    return new DocAttrStep(j.attr, j.value);
  }
}
for (const [name, cls] of Object.entries({
  replace: ReplaceStep,
  replaceAround: ReplaceAroundStep,
  addMark: AddMarkStep,
  removeMark: RemoveMarkStep,
  addNodeMark: AddNodeMarkStep,
  removeNodeMark: RemoveNodeMarkStep,
  attr: AttrStep,
  docAttr: DocAttrStep,
}))
  Step.jsonID(name, cls);
module.exports = {
  Step,
  StepResult,
  ReplaceStep,
  ReplaceAroundStep,
  AddMarkStep,
  RemoveMarkStep,
  AddNodeMarkStep,
  RemoveNodeMarkStep,
  AttrStep,
  DocAttrStep,
};
