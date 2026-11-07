"use strict";
const OrderedMap = require("vorderedmap");
const { Node, TextNode, Fragment, Mark, emptyAttrs } = require("./core.cjs");
const { ContentMatch } = require("./content.cjs");
function descriptors(spec) {
  const out = Object.create(null);
  for (const name of Object.keys(spec || {})) {
    const item = spec[name],
      hasDefault = Object.hasOwn(item, "default");
    out[name] = {
      hasDefault,
      default: item.default,
      validate: item.validate,
      isRequired: !hasDefault,
    };
  }
  return out;
}
function defaults(attrs) {
  const out = Object.create(null);
  for (const name of Object.keys(attrs)) {
    if (!attrs[name].hasDefault) return null;
    out[name] = attrs[name].default;
  }
  return out;
}
function compute(type, input) {
  if (!input && type.defaultAttrs) return type.defaultAttrs;
  const out = Object.create(null);
  for (const name of Object.keys(type.attrs)) {
    const attr = type.attrs[name];
    let value = input && Object.hasOwn(input, name) ? input[name] : undefined;
    if (value === undefined) {
      if (!attr.hasDefault)
        throw new RangeError("No value supplied for attribute " + name);
      value = attr.default;
    }
    out[name] = value;
  }
  type.checkAttrs(out);
  return out;
}
function check(type, values) {
  for (const name of Object.keys(values)) {
    if (!Object.hasOwn(type.attrs, name))
      throw new RangeError(
        "Unsupported attribute " + name + " for " + type.name,
      );
  }
  for (const [name, attr] of Object.entries(type.attrs)) {
    const validate = attr.validate;
    if (typeof validate === "function") validate(values[name]);
    else if (typeof validate === "string") {
      const kind = values[name] === null ? "null" : typeof values[name];
      if (!validate.split("|").includes(kind))
        throw new RangeError(
          "Expected value of type " +
            validate +
            " for attribute " +
            name +
            " on type " +
            type.name +
            ", got " +
            kind,
        );
    }
  }
}
class NodeType {
  constructor(name, schema, spec) {
    this.name = name;
    this.schema = schema;
    this.spec = spec;
    this.groups = (spec.group || "").split(" ").filter(Boolean);
    this.attrs = descriptors(spec.attrs);
    this.defaultAttrs = defaults(this.attrs);
    this.isText = name === "text";
    this.isBlock = !spec.inline && !this.isText;
    this.contentMatch = ContentMatch.empty;
    this.inlineContent = false;
    this.markSet = null;
  }
  get isInline() {
    return !this.isBlock;
  }
  get isTextblock() {
    return this.isBlock && this.inlineContent;
  }
  get isLeaf() {
    return this.contentMatch === ContentMatch.empty;
  }
  get isAtom() {
    return this.isLeaf || !!this.spec.atom;
  }
  get whitespace() {
    return this.spec.whitespace || (this.spec.code ? "pre" : "normal");
  }
  isInGroup(name) {
    return this.groups.includes(name);
  }
  hasRequiredAttrs() {
    return Object.values(this.attrs).some((a) => a.isRequired);
  }
  compatibleContent(other) {
    return this === other || this.contentMatch.compatible(other.contentMatch);
  }
  computeAttrs(attrs) {
    return compute(this, attrs);
  }
  checkAttrs(attrs) {
    check(this, attrs);
  }
  create(attrs = null, content = null, marks) {
    if (this.isText)
      throw new Error("NodeType.create can not construct text nodes");
    return new Node(
      this,
      compute(this, attrs),
      Fragment.from(content),
      Mark.setFrom(marks),
    );
  }
  createChecked(attrs, content, marks) {
    content = Fragment.from(content);
    this.checkContent(content);
    return this.create(attrs, content, marks);
  }
  createAndFill(attrs, content, marks) {
    attrs = compute(this, attrs);
    content = Fragment.from(content);
    const before = this.contentMatch.fillBefore(content);
    if (!before) return null;
    content = before.append(content);
    const match = this.contentMatch.matchFragment(content),
      after = match && match.fillBefore(Fragment.empty, true);
    return after
      ? new Node(this, attrs, content.append(after), Mark.setFrom(marks))
      : null;
  }
  validContent(content) {
    let match = this.contentMatch;
    for (const node of content.content) {
      match = match.matchType(node.type);
      if (
        !match ||
        (this.markSet !== null &&
          node.marks.length &&
          !this.allowsMarks(node.marks))
      )
        return false;
    }
    return match.validEnd;
  }
  checkContent(content) {
    if (!this.validContent(content))
      throw new RangeError(
        "Invalid content for node " +
          this.name +
          ": " +
          content.toString().slice(0, 80),
      );
  }
  allowsMarkType(type) {
    return this.markSet === null || this.markSet.includes(type);
  }
  allowsMarks(marks) {
    return marks.every((m) => this.allowsMarkType(m.type));
  }
  allowedMarks(marks) {
    return this.allowsMarks(marks)
      ? marks
      : marks.filter((m) => this.allowsMarkType(m.type));
  }
  static compile(nodes, schema) {
    const out = Object.create(null);
    nodes.forEach((name, spec) => {
      out[name] = new NodeType(name, schema, spec);
    });
    return out;
  }
}
class MarkType {
  constructor(name, rank, schema, spec) {
    this.name = name;
    this.rank = rank;
    this.schema = schema;
    this.spec = spec;
    this.attrs = descriptors(spec.attrs);
    this.defaultAttrs = defaults(this.attrs);
    this.instance = this.defaultAttrs
      ? new Mark(this, this.defaultAttrs)
      : null;
    this.excluded = [];
  }
  create(attrs) {
    return !attrs && this.instance
      ? this.instance
      : new Mark(this, compute(this, attrs));
  }
  checkAttrs(attrs) {
    check(this, attrs);
  }
  removeFromSet(set) {
    return set.some((m) => m.type === this)
      ? set.filter((m) => m.type !== this)
      : set;
  }
  isInSet(set) {
    return set.find((m) => m.type === this);
  }
  excludes(type) {
    return this.excluded.includes(type);
  }
  static compile(marks, schema) {
    const out = Object.create(null);
    let rank = 0;
    marks.forEach((name, spec) => {
      out[name] = new MarkType(name, rank++, schema, spec);
    });
    return out;
  }
}
function markTypes(schema, names) {
  const out = [];
  for (const name of names.split(" ").filter(Boolean)) {
    const matches =
      name === "_"
        ? Object.values(schema.marks)
        : Object.hasOwn(schema.marks, name)
          ? [schema.marks[name]]
          : Object.values(schema.marks).filter((t) =>
              (t.spec.group || "").split(" ").includes(name),
            );
    if (!matches.length) throw new SyntaxError("Unknown mark type: " + name);
    out.push(...matches);
  }
  return out;
}
class Schema {
  constructor(spec) {
    this.spec = {
      ...spec,
      nodes: OrderedMap.from(spec.nodes),
      marks: OrderedMap.from(spec.marks),
    };
    this.nodes = NodeType.compile(this.spec.nodes, this);
    this.marks = MarkType.compile(this.spec.marks, this);
    this.cached = Object.create(null);
    this.cached.wrappings = Object.create(null);
    this.linebreakReplacement = null;
    this.topNodeType = this.nodes[spec.topNode || "doc"];
    if (!this.topNodeType)
      throw new RangeError("Schema is missing its top node type");
    if (!this.nodes.text)
      throw new RangeError("Every schema needs a text type");
    if (Object.keys(this.nodes.text.attrs).length)
      throw new RangeError("The text node type should not have attributes");
    const expressions = new Map();
    for (const type of Object.values(this.nodes)) {
      if (this.marks[type.name])
        throw new RangeError(type.name + " can not be both a node and a mark");
      const expression = type.spec.content || "";
      if (!expressions.has(expression))
        expressions.set(expression, ContentMatch.parse(expression, this.nodes));
      type.contentMatch = expressions.get(expression);
      type.inlineContent = type.contentMatch.inlineContent;
      type.markSet =
        type.spec.marks === "_"
          ? null
          : type.spec.marks !== undefined
            ? markTypes(this, type.spec.marks)
            : type.inlineContent
              ? null
              : [];
      if (type.spec.linebreakReplacement) {
        if (this.linebreakReplacement)
          throw new RangeError("Multiple linebreak nodes defined");
        if (!type.isInline || !type.isLeaf)
          throw new RangeError(
            "Linebreak replacement nodes must be inline leaf nodes",
          );
        this.linebreakReplacement = type;
      }
    }
    for (const type of Object.values(this.marks))
      type.excluded =
        type.spec.excludes == null
          ? [type]
          : markTypes(this, type.spec.excludes);
    this.nodeFromJSON = (json) => Node.fromJSON(this, json);
    this.markFromJSON = (json) => Mark.fromJSON(this, json);
  }
  node(type, attrs, content, marks) {
    if (typeof type === "string") type = this.nodeType(type);
    if (!(type instanceof NodeType) || type.schema !== this)
      throw new RangeError("Invalid node type or schema");
    return type.createChecked(attrs, content, marks);
  }
  text(text, marks) {
    return new TextNode(
      this.nodes.text,
      this.nodes.text.defaultAttrs || emptyAttrs,
      text,
      Mark.setFrom(marks),
    );
  }
  mark(type, attrs) {
    if (typeof type === "string") type = this.marks[type];
    if (!(type instanceof MarkType) || type.schema !== this)
      throw new RangeError("Unknown mark type");
    return type.create(attrs);
  }
  nodeType(name) {
    const type = this.nodes[name];
    if (!type) throw new RangeError("Unknown node type: " + name);
    return type;
  }
}
module.exports = { Schema, NodeType, MarkType };
