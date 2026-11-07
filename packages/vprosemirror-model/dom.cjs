"use strict";
const { Fragment, Mark, Slice } = require("./core.cjs");
function owner(options) {
  const doc = options?.document || globalThis.document;
  if (!doc)
    throw new RangeError("A document is required for DOM serialization");
  return doc;
}
function forbiddenArrays(value, seen = new Set(), out = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return out;
  seen.add(value);
  if (Array.isArray(value)) out.add(value);
  for (const key of Object.keys(value)) forbiddenArrays(value[key], seen, out);
  return out;
}
function renderSpec(doc, spec, namespace, blocked) {
  if (spec?.nodeType) return { dom: spec };
  if (spec?.dom?.nodeType) return spec;
  if (typeof spec === "string") return { dom: doc.createTextNode(spec) };
  if (!Array.isArray(spec) || typeof spec[0] !== "string")
    throw new RangeError("Invalid DOM output spec");
  if (blocked?.has(spec))
    throw new RangeError(
      "Using an array from an attribute object as a DOM spec",
    );
  let tag = spec[0];
  const split = tag.indexOf(" ");
  if (split >= 0) {
    namespace = tag.slice(0, split);
    tag = tag.slice(split + 1);
  }
  const dom = namespace
    ? doc.createElementNS(namespace, tag)
    : doc.createElement(tag);
  let offset = 1,
    contentDOM;
  const attrs = spec[1];
  if (
    attrs &&
    typeof attrs === "object" &&
    !Array.isArray(attrs) &&
    !attrs.nodeType
  ) {
    offset++;
    for (const key of Object.keys(attrs)) {
      const value = attrs[key];
      if (value == null) continue;
      const space = key.indexOf(" ");
      if (space >= 0)
        dom.setAttributeNS(
          key.slice(0, space),
          key.slice(space + 1),
          String(value),
        );
      else if (key === "style" && dom.style) dom.style.cssText = String(value);
      else dom.setAttribute(key, String(value));
    }
  }
  for (let i = offset; i < spec.length; i++) {
    if (spec[i] === 0) {
      if (spec.length !== offset + 1)
        throw new RangeError(
          "Content hole must be the only child of its parent node",
        );
      contentDOM = dom;
    } else {
      const child = renderSpec(doc, spec[i], namespace, blocked);
      dom.appendChild(child.dom);
      if (child.contentDOM) {
        if (contentDOM) throw new RangeError("Multiple content holes");
        contentDOM = child.contentDOM;
      }
    }
  }
  return { dom, ...(contentDOM ? { contentDOM } : {}) };
}
class DOMSerializer {
  constructor(nodes, marks) {
    this.nodes = nodes;
    this.marks = marks;
  }
  serializeFragment(fragment, options = {}, target) {
    const doc = owner(options);
    target = target || doc.createDocumentFragment();
    let active = [],
      parents = [target];
    fragment.forEach((node) => {
      const marks = node.marks.filter((m) => this.marks[m.type.name]);
      let shared = 0;
      while (
        shared < active.length &&
        shared < marks.length &&
        active[shared].eq(marks[shared]) &&
        marks[shared].type.spec.spanning !== false
      )
        shared++;
      active = active.slice(0, shared);
      parents = parents.slice(0, shared + 1);
      for (let i = shared; i < marks.length; i++) {
        const out = this.serializeMark(marks[i], node.isInline, options);
        parents.at(-1).appendChild(out.dom);
        parents.push(out.contentDOM || out.dom);
        active.push(marks[i]);
      }
      parents.at(-1).appendChild(this.serializeNodeInner(node, options));
    });
    return target;
  }
  serializeNodeInner(node, options = {}) {
    const doc = owner(options);
    if (node.isText) return doc.createTextNode(node.text);
    const fn = this.nodes[node.type.name];
    if (!fn) throw new RangeError("No serializer for " + node.type.name);
    const out = renderSpec(doc, fn(node), null, forbiddenArrays(node.attrs));
    if (out.contentDOM) {
      if (node.isLeaf)
        throw new RangeError("Content hole not allowed in a leaf node spec");
      this.serializeFragment(node.content, options, out.contentDOM);
    }
    return out.dom;
  }
  serializeNode(node, options = {}) {
    let dom = this.serializeNodeInner(node, options);
    for (let i = node.marks.length - 1; i >= 0; i--) {
      const out = this.serializeMark(node.marks[i], node.isInline, options);
      if (out) {
        (out.contentDOM || out.dom).appendChild(dom);
        dom = out.dom;
      }
    }
    return dom;
  }
  serializeMark(mark, inline, options = {}) {
    const fn = this.marks[mark.type.name];
    return fn
      ? renderSpec(
          owner(options),
          fn(mark, inline),
          null,
          forbiddenArrays(mark.attrs),
        )
      : null;
  }
  static renderSpec(doc, spec, namespace) {
    return renderSpec(doc, spec, namespace);
  }
  static nodesFromSchema(schema) {
    const out = Object.create(null);
    for (const t of Object.values(schema.nodes))
      if (t.spec.toDOM) out[t.name] = t.spec.toDOM;
    if (!out.text) out.text = (n) => n.text;
    return out;
  }
  static marksFromSchema(schema) {
    const out = Object.create(null);
    for (const t of Object.values(schema.marks))
      if (t.spec.toDOM) out[t.name] = t.spec.toDOM;
    return out;
  }
  static fromSchema(schema) {
    return (
      schema.cached.domSerializer ||
      (schema.cached.domSerializer = new DOMSerializer(
        this.nodesFromSchema(schema),
        this.marksFromSchema(schema),
      ))
    );
  }
}
const blocks = new Set(
  "address article aside blockquote canvas dd div dl dt fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr li main nav noscript ol output p pre section table tfoot ul video".split(
    " ",
  ),
);
const ignored = new Set(
  "head script style title meta link object noscript".split(" "),
);
class DOMParser {
  constructor(schema, rules) {
    this.schema = schema;
    this.rules = rules;
    this.tags = rules.filter((r) => r.tag);
    this.styles = rules.filter((r) => r.style);
    this.normalizeLists = true;
  }
  parse(dom, options = {}) {
    return new ParseSession(this, options, false).run(dom);
  }
  parseSlice(dom, options = {}) {
    return Slice.maxOpen(new ParseSession(this, options, true).run(dom));
  }
  static schemaRules(schema) {
    const rules = [];
    for (const kind of ["marks", "nodes"])
      for (const type of Object.values(schema[kind]))
        for (const original of type.spec.parseDOM || [])
          rules.push({
            ...original,
            ...(kind === "marks"
              ? { mark: original.mark || type.name }
              : { node: original.node || type.name }),
          });
    return rules.sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50));
  }
  static fromSchema(schema) {
    return (
      schema.cached.domParser ||
      (schema.cached.domParser = new DOMParser(
        schema,
        this.schemaRules(schema),
      ))
    );
  }
}
class ParseSession {
  constructor(parser, options, open) {
    this.parser = parser;
    this.schema = parser.schema;
    this.options = options;
    this.open = open;
    const top =
      options.topNode || (!open ? this.schema.topNodeType.create() : null);
    this.stack = [
      this.frame(
        top?.type || null,
        top?.attrs || null,
        Mark.none,
        options.preserveWhitespace === "full"
          ? 2
          : options.preserveWhitespace
            ? 1
            : 0,
        options.topMatch,
      ),
    ];
    this.forceBlock = 0;
  }
  frame(type, attrs, marks, space, match) {
    return {
      type,
      attrs,
      marks,
      space: type?.whitespace === "pre" ? 2 : space,
      children: [],
      match: match || (type ? type.contentMatch : null),
    };
  }
  get top() {
    return this.stack.at(-1);
  }
  position() {
    let pos = 0;
    for (let i = 0; i < this.stack.length; i++)
      pos +=
        this.stack[i].children.reduce((n, c) => n + c.nodeSize, 0) +
        (i ? 1 : 0);
    return pos;
  }
  find(dom, offset) {
    for (const item of this.options.findPositions || [])
      if (item.node === dom && item.offset === offset)
        item.pos = this.position();
  }
  ignoredPositions(dom) {
    for (const item of this.options.findPositions || [])
      if (item.node === dom || dom.contains?.(item.node))
        item.pos = this.position();
  }
  finish() {
    const end = this.options.findPositions ? this.position() : 0;
    const frame = this.stack.pop();
    if (!frame.space) {
      const last = frame.children.at(-1);
      if (last?.isText) {
        const text = last.text.replace(/[ \t\r\n\f]+$/, "");
        const newEnd = end - (last.text.length - text.length);
        for (const point of this.options.findPositions || []) {
          if (point.pos > newEnd && point.pos <= end) point.pos = newEnd;
        }
        if (text)
          frame.children[frame.children.length - 1] = last.withText(text);
        else frame.children.pop();
      }
    }
    let content = Fragment.from(frame.children);
    if (!this.open && frame.type) {
      const after = frame.match?.fillBefore(Fragment.empty, true);
      if (after) content = content.append(after);
    }
    const node = frame.type
      ? frame.type.create(frame.attrs, content, frame.marks)
      : null;
    if (this.stack.length && node) this.append(node);
    return node || content;
  }
  append(node) {
    const frame = this.top;
    if (frame.type) {
      node = node.mark(frame.type.allowedMarks(node.marks));
      const next = frame.match?.matchType(node.type);
      if (next) frame.match = next;
    }
    const last = frame.children.at(-1);
    if (last?.isText && node.isText && last.sameMarkup(node))
      frame.children[frame.children.length - 1] = last.withText(
        last.text + node.text,
      );
    else frame.children.push(node);
  }
  context(pattern) {
    const names = [];
    const ctx = this.options.context;
    if (ctx) for (let i = 0; i <= ctx.depth; i++) names.push(ctx.node(i).type);
    for (const frame of this.stack) if (frame.type) names.push(frame.type);
    const same = (type, name) => type.name === name || type.isInGroup(name);
    return pattern.split("|").some((part) => {
      const parts = part.split("/");
      if (parts.at(-1) === "") parts.pop();
      function match(i, j) {
        if (i < 0) return true;
        if (parts[i] === "") {
          if (i === 0) return true;
          for (let n = j; n >= -1; n--) if (match(i - 1, n)) return true;
          return false;
        }
        return j >= 0 && same(names[j], parts[i]) && match(i - 1, j - 1);
      }
      return match(parts.length - 1, names.length - 1);
    });
  }
  tagRules(dom) {
    const custom = this.options.ruleFromNode?.(dom);
    if (custom) return [custom];
    const found = [];
    for (const rule of this.parser.tags) {
      if (
        (rule.namespace !== undefined && dom.namespaceURI !== rule.namespace) ||
        (rule.context && !this.context(rule.context)) ||
        !dom.matches(rule.tag)
      )
        continue;
      const attrs = rule.getAttrs ? rule.getAttrs(dom) : rule.attrs;
      if (attrs === false) continue;
      found.push({ ...rule, attrs });
      if (rule.consuming !== false) break;
    }
    return found;
  }
  styled(dom, marks) {
    for (const property of new Set(
      this.parser.styles.map((r) => r.style.split("=")[0]),
    )) {
      const value = dom.style?.getPropertyValue(property);
      if (!value) continue;
      for (const rule of this.parser.styles) {
        const parts = rule.style.split("=");
        if (
          parts[0] !== property ||
          (parts.length > 1 && parts.slice(1).join("=") !== value) ||
          (rule.context && !this.context(rule.context))
        )
          continue;
        const attrs = rule.getAttrs ? rule.getAttrs(value) : rule.attrs;
        if (attrs === false) continue;
        if (rule.ignore) return null;
        if (rule.clearMark) marks = marks.filter((m) => !rule.clearMark(m));
        else if (rule.mark)
          marks = this.schema.mark(rule.mark, attrs).addToSet(marks);
        if (rule.consuming !== false) break;
      }
    }
    return marks;
  }
  route(type) {
    let best = null;
    for (let depth = this.stack.length - 1; depth >= 0; depth--) {
      const frame = this.stack[depth];
      if (!frame.type) return best || { depth, wrappers: [] };
      if (frame.match?.matchType(type)) return { depth, wrappers: [] };
      if (this.open && !frame.children.length) {
        const queue = [frame.match],
          seen = new Set();
        for (let i = 0; i < queue.length; i++) {
          const state = queue[i];
          if (!state || seen.has(state)) continue;
          seen.add(state);
          if (state.matchType(type)) {
            frame.match = state;
            return { depth, wrappers: [] };
          }
          for (const edge of state.next) queue.push(edge.next);
        }
      }
      const wrappers = frame.match?.findWrapping(type);
      if (wrappers && (!best || wrappers.length < best.wrappers.length))
        best = { depth, wrappers };
      if (best && frame.solid) return best;
    }
    return best;
  }
  place(type, marks, space) {
    const route = this.route(type);
    if (!route) return false;
    while (this.stack.length - 1 > route.depth) this.finish();
    for (const wrapper of route.wrappers) {
      const applied = this.top.type
        ? this.top.type.allowedMarks(marks)
        : Mark.none;
      this.stack.push(this.frame(wrapper, null, applied, space));
    }
    return true;
  }
  insert(node, marks, space) {
    if (!this.place(node.type, marks, space)) return false;
    this.append(node.mark(marks));
    return true;
  }
  text(dom, marks, space) {
    const original = dom.nodeValue || "";
    let value = original,
      stripLeading = false;
    space = Math.max(space, this.top.space);
    if (space === 2) value = value.replace(/\r\n?/g, "\n");
    else if (space === 1) value = value.replace(/\r\n?|\n/g, " ");
    else value = value.replace(/[ \t\r\n\f]+/g, " ");
    if (
      ((!space && this.top.type && !this.top.type.inlineContent) ||
        (!this.top.type && this.forceBlock)) &&
      /^[ \t\n\r]*$/.test(value)
    )
      return;
    if (!this.top.type && this.forceBlock) {
      const paragraph = Object.values(this.schema.nodes).find(
        (t) => t.isTextblock && !t.hasRequiredAttrs(),
      );
      if (paragraph)
        this.stack.push(this.frame(paragraph, null, Mark.none, space));
    }
    if (!space) {
      const last = this.top.children.at(-1);
      if (
        !last ||
        (last.isText && /[ \t\n\r\f]$/.test(last.text)) ||
        last.type.name === "hard_break"
      ) {
        stripLeading = true;
        value = value.replace(/^ /, "");
      }
    }
    if (!value) {
      for (const p of this.options.findPositions || [])
        if (p.node === dom) p.pos = this.position();
      return;
    }
    if (!this.place(this.schema.nodes.text, marks, space)) return;
    const start = this.position();
    if (
      space === 2 &&
      this.schema.linebreakReplacement &&
      this.top.type?.whitespace !== "pre"
    ) {
      const parts = value.split("\n");
      for (let i = 0; i < parts.length; i++) {
        if (i)
          this.insert(this.schema.linebreakReplacement.create(), marks, space);
        if (parts[i]) this.append(this.schema.text(parts[i], marks));
      }
    } else this.append(this.schema.text(value, marks));
    // Map source offsets through normalization, not through the original length.
    // In particular, collapsed spaces must not move a cursor past nearby text.
    for (const p of this.options.findPositions || [])
      if (p.node === dom) {
        let prefix = original.slice(0, p.offset);
        if (space === 2) prefix = prefix.replace(/\r\n?/g, "\n");
        else if (space === 1) prefix = prefix.replace(/\r\n?|\n/g, " ");
        else prefix = prefix.replace(/[ \t\r\n\f]+/g, " ");
        if (stripLeading) prefix = prefix.replace(/^ /, "");
        p.pos = start + prefix.length;
      }
  }
  children(dom, marks, space, from = 0, to = dom.childNodes.length) {
    for (let i = from; i < to; i++) {
      this.find(dom, i);
      this.visit(dom.childNodes[i], marks, space);
    }
    this.find(dom, to);
  }
  visit(dom, marks, space) {
    if (dom.nodeType === 3) {
      this.text(dom, marks, space);
      return;
    }
    if (dom.nodeType !== 1) return;
    const name = dom.localName.toLowerCase(),
      rules = this.tagRules(dom),
      skip = rules.some((r) => r.skip);
    if (ignored.has(name) || rules.some((r) => r.ignore)) {
      this.ignoredPositions(dom);
      return;
    }
    if (rules.some((r) => r.closeParent)) {
      if (this.stack.length > 1) this.finish();
      return;
    }
    const pre =
      name === "pre" ||
      /^(pre|pre-wrap|break-spaces)$/.test(dom.style?.whiteSpace || "");
    if (pre) space = 2;
    if (!skip) {
      marks = this.styled(dom, marks);
      if (!marks) return;
    }
    const before = this.stack.length;
    let entered = null,
      consumedMarks = Mark.none;
    for (const rule of rules) {
      if (rule.preserveWhitespace !== undefined)
        space =
          rule.preserveWhitespace === "full"
            ? 2
            : rule.preserveWhitespace
              ? 1
              : 0;
      if (rule.mark)
        marks = this.schema.mark(rule.mark, rule.attrs).addToSet(marks);
      if (rule.node) {
        const type = this.schema.nodes[rule.node];
        if (type.isLeaf) {
          if (
            name === "br" &&
            this.top.type?.inlineContent &&
            !this.top.match?.matchType(type)
          ) {
            this.insert(this.schema.text("\n"), marks, 2);
            return;
          }
          if (
            !this.insert(type.create(rule.attrs), marks, space) &&
            name === "br" &&
            this.top.type?.inlineContent
          )
            this.insert(this.schema.text("\n"), marks, 2);
          this.ignoredPositions(dom);
          return;
        }
        if (this.place(type, marks, space)) {
          const allowed = this.top.type
            ? this.top.type.allowedMarks(marks)
            : Mark.none;
          consumedMarks = allowed;
          const frame = this.frame(type, rule.attrs, allowed, space);
          frame.solid = true;
          this.stack.push(frame);
          entered = frame;
        }
      }
    }
    if (name === "br" && !entered && !rules.some((r) => r.node)) {
      if (this.top.type?.inlineContent)
        this.insert(this.schema.text("\n"), marks, 2);
      else {
        const paragraph = Object.values(this.schema.nodes).find(
          (t) => t.isTextblock && !t.hasRequiredAttrs(),
        );
        if (paragraph && this.place(paragraph, marks, space))
          this.stack.push(this.frame(paragraph, null, Mark.none, space));
      }
      return;
    }
    const block = blocks.has(name) && !entered;
    if (block) {
      while (this.stack.length > 1 && this.top.type?.inlineContent)
        this.finish();
      this.forceBlock++;
    }
    let content = dom;
    for (const rule of rules) {
      if (rule.contentElement)
        content =
          typeof rule.contentElement === "string"
            ? dom.querySelector(rule.contentElement)
            : typeof rule.contentElement === "function"
              ? rule.contentElement(dom)
              : rule.contentElement;
      else if (rule.skip?.nodeType) content = rule.skip;
    }
    const childMarks = marks.filter((m) => !consumedMarks.some((n) => n.eq(m)));
    const ruleContent = rules.find((r) => r.getContent);
    if (ruleContent) {
      ruleContent
        .getContent(dom, this.schema)
        .forEach((n) => this.insert(n, childMarks, space));
    } else if (content) this.children(content, childMarks, space);
    if (entered) {
      const index = this.stack.indexOf(entered);
      if (index >= 0) while (this.stack.length > index) this.finish();
      if (rules.filter((r) => r.node).length > 1)
        while (this.stack.length >= before + 1) this.finish();
    } else if (block) {
      while (this.stack.length > 1 && this.top.type?.inlineContent)
        this.finish();
      this.forceBlock--;
    }
  }
  run(dom) {
    this.children(
      dom,
      Mark.none,
      this.top.space,
      this.options.from || 0,
      this.options.to ?? dom.childNodes.length,
    );
    while (this.stack.length > 1) this.finish();
    return this.finish();
  }
}
module.exports = { DOMParser, DOMSerializer };
