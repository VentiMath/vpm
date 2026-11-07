"use strict";
const { DOMSerializer } = require("vprosemirror-model");
const { DecorationSet } = require("./decorations.cjs");

const sameAttrs = (a, b) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.keys(a).every((k) => a[k] === b[k]);
function assignAttrs(dom, next, previous = {}) {
  for (const key of Object.keys(previous))
    if (!(key in next)) dom.removeAttribute(key);
  for (const key of Object.keys(next))
    if (next[key] != null && dom.getAttribute(key) !== String(next[key])) {
      if (key === "style") dom.style.cssText = String(next[key]);
      else dom.setAttribute(key, String(next[key]));
    }
}
function mergeAttrs(target, attrs) {
  for (const key of Object.keys(attrs)) {
    if (key === "nodeName" || attrs[key] == null) continue;
    if (key === "class")
      target[key] = [target[key], attrs[key]].filter(Boolean).join(" ");
    else if (key === "style")
      target[key] = [target[key], attrs[key]].filter(Boolean).join(";");
    else if (!(key in target)) target[key] = attrs[key];
  }
  return target;
}
function equalDecorations(a, b) {
  return a.length === b.length && a.every((d, i) => d.type.eq(b[i].type));
}
function equalSource(a, b) {
  return a === b || !!a.eq?.(b);
}
function snapshotAttrs(element) {
  return element.nodeType === 1
    ? Object.fromEntries([...element.attributes].map((a) => [a.name, a.value]))
    : {};
}
// Preserve the model serializer's prohibition on using attribute arrays as DOM
// recipes, while passing the actual node (including its content) to toDOM.
function nodeSpec(serializer, node, document) {
  const arrays = new Set(),
    seen = new Set();
  const collect = (value) => {
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) arrays.add(value);
    for (const key of Object.keys(value)) collect(value[key]);
  };
  collect(node.attrs);
  const make = serializer.nodes[node.type.name];
  if (!make) throw new RangeError("No DOM serializer for " + node.type.name);
  const spec = make(node);
  const check = (value) => {
    if (!Array.isArray(value)) return;
    if (arrays.has(value))
      throw new RangeError("Using an attribute array as a DOM recipe");
    for (const child of value) check(child);
  };
  check(spec);
  const out = DOMSerializer.renderSpec(document, spec);
  if (node.isLeaf && out.contentDOM)
    throw new RangeError("Leaf node has a content hole");
  return out;
}

class ReadOnlyRenderer {
  constructor(
    place,
    {
      doc,
      decorations = DecorationSet.empty,
      attributes = {},
      widgetHost,
    } = {},
  ) {
    if (!place?.ownerDocument || !doc)
      throw new TypeError("A mount element and document are required");
    this.document = place.ownerDocument;
    this.dom = this.document.createElement("div");
    assignAttrs(this.dom, {
      ...attributes,
      class: ["ProseMirror", attributes.class].filter(Boolean).join(" "),
      contenteditable: "false",
    });
    this.domRecords = new WeakMap();
    this.revision = 0;
    this.widgetHost = widgetHost;
    this.destroyed = false;
    this.root = {
      kind: "root",
      dom: this.dom,
      contentDOM: this.dom,
      children: [],
      position: () => -1,
    };
    this.domRecords.set(this.dom, this.root);
    try {
      this.update(doc, decorations);
      place.appendChild(this.dom);
    } catch (error) {
      this.destroy();
      throw error;
    }
  }
  update(doc, decorations = DecorationSet.empty) {
    if (this.destroyed) throw new Error("Renderer has been destroyed");
    if (this.doc && this.doc.type.schema !== doc.type.schema)
      throw new RangeError("Cannot change the renderer schema");
    if (this.doc === doc && equalSource(this.decorations, decorations)) return;
    this.serializer = DOMSerializer.fromSchema(doc.type.schema);
    try {
      this.root.children = this.reconcile(
        this.root.contentDOM,
        this.root.children,
        this.plan(doc, decorations, this.root),
      );
    } catch (error) {
      this.destroy();
      throw error;
    }
    this.doc = doc;
    this.decorations = decorations;
    this.revision++;
  }
  // Cache bounds only within one successful update. Retained position callbacks
  // recalculate them after an ancestor moves; unchanged DOM needs no rebuilding.
  bounds(record) {
    if (record.rangeRevision === this.revision) return record.range;
    const from = record.kind === "root" ? 0 : record.position();
    let to = from;
    if (record.kind === "root") to = this.doc.content.size;
    else if (record.kind === "model") to += record.node.nodeSize;
    else if (record.kind === "text") to += record.value.length;
    else if (record.children.length)
      to = this.bounds(record.children.at(-1))[1];
    record.rangeRevision = this.revision;
    return (record.range = [from, to]);
  }
  childAt(record, pos, inclusive) {
    let low = 0,
      high = record.children.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      const end = this.bounds(record.children[mid])[1];
      if (end < pos || (!inclusive && end === pos)) low = mid + 1;
      else high = mid;
    }
    return low;
  }
  domOffset(record) {
    if (record.offsetRevision === this.revision) return record.offset;
    let offset = 0;
    for (
      let node = record.dom.previousSibling;
      node;
      node = node.previousSibling
    )
      offset++;
    record.offsetRevision = this.revision;
    return (record.offset = offset);
  }
  contentBounds(record) {
    const [from, to] = this.bounds(record);
    return record.kind === "model" ? [from + 1, to - 1] : [from, to];
  }
  assertLive() {
    if (this.destroyed) throw new Error("Renderer has been destroyed");
  }
  domAtPos(pos, side = 0) {
    this.assertLive();
    if (!Number.isInteger(pos) || pos < 0 || pos > this.doc.content.size)
      throw new RangeError("Position outside the document");
    const find = (record) => {
      if (record.kind === "text")
        return { node: record.dom, offset: pos - record.position() };
      const children = record.children;
      let index = this.childAt(record, pos, true);
      for (; index < children.length; index++) {
        const child = children[index],
          [from, to] = this.bounds(child);
        if (from < pos && pos < to) return find(child);
        if (
          to > pos ||
          (from === pos &&
            (to > from ||
              child.kind === "break" ||
              (child.kind === "widget" && child.deco.type.side >= 0)))
        )
          break;
      }
      const adjacent = children[side < 0 ? index - 1 : index];
      if (
        side &&
        adjacent &&
        ["text", "inline", "mark"].includes(adjacent.kind)
      )
        return find(adjacent);
      const container = record.contentDOM;
      if (!container) {
        const parent = record.dom.parentNode;
        return {
          node: parent,
          offset: this.domOffset(record),
        };
      }
      const next = children[index];
      return {
        node: container,
        offset: next ? this.domOffset(next) : container.childNodes.length,
      };
    };
    return find(this.root);
  }
  nodeDOM(pos) {
    this.assertLive();
    if (!Number.isInteger(pos) || pos < 0 || pos >= this.doc.content.size)
      return null;
    const find = (record) => {
      const child = record.children[this.childAt(record, pos, false)];
      if (!child) return null;
      const [from] = this.bounds(child);
      if (from > pos) return null;
      if (from === pos && child.kind === "model") return child.baseDOM;
      if (child.kind === "text") return from === pos ? child.dom : null;
      return find(child);
    };
    return find(this.root);
  }
  posAtDOM(node, offset, bias = -1) {
    this.assertLive();
    if (!node || !this.dom.contains(node))
      throw new RangeError("DOM position outside the renderer");
    const size =
      node.nodeType === 3 ? node.nodeValue.length : node.childNodes.length;
    if (!Number.isInteger(offset) || offset < 0 || offset > size)
      throw new RangeError("Invalid DOM offset");
    let owner = node,
      record;
    while (owner && !(record = this.domRecords.get(owner)))
      owner = owner.parentNode;
    if (!record || (record !== this.root && !record.active))
      throw new RangeError("DOM position outside the renderer");
    const [from, to] = this.bounds(record);
    if (record.kind === "text") return from + offset;
    if (record.kind === "widget" || record.kind === "break") return from;
    const content = record.contentDOM;
    if (!content) return bias > 0 ? to : from;
    const [start, end] = this.contentBounds(record);
    if (node === content) {
      const before = node.childNodes[offset];
      for (const child of record.children) {
        if (child.dom === before) return this.bounds(child)[0];
      }
      return end;
    }
    // A schema may put fixed labels or other markup around its content hole.
    // Those points map to the nearest edge of the content, not into that markup.
    if (node.contains(content)) {
      let branch = content;
      while (branch.parentNode !== node) branch = branch.parentNode;
      return offset <= [...node.childNodes].indexOf(branch) ? start : end;
    }
    return node.compareDocumentPosition(content) & 4 ? start : end;
  }
  plan(node, source, parent) {
    const local = source.locals(node),
      items = [],
      widgets = local
        .filter((d) => d.widget)
        .sort((a, b) => a.from - b.from || a.type.side - b.type.side);
    const inline = local.filter((d) => d.inline);
    const position = (offset) => () => parent.position() + 1 + offset;
    const widgetItem = (d) => {
      const side = d.type.side;
      const at = node.resolve(d.from);
      const marks =
        d.spec.marks || (side < 0 ? at.nodeBefore : at.nodeAfter)?.marks || [];
      return {
        kind: "widget",
        deco: d,
        marks,
        position: position(d.from),
        identity: d.type.toDOM,
      };
    };
    let wi = 0;
    node.forEach((child, offset) => {
      while (wi < widgets.length && widgets[wi].from <= offset)
        items.push(widgetItem(widgets[wi++]));
      const outer = local.filter(
        (d) =>
          !d.widget &&
          !d.inline &&
          d.from === offset &&
          d.to === offset + child.nodeSize,
      );
      if (!child.isText) {
        const model = {
          kind: "model",
          node: child,
          identity: child,
          marks: child.marks,
          source: source.forChild(offset, child),
          outer,
          position: position(offset),
        };
        const active = child.isInline
          ? inline.filter(
              (d) => d.from <= offset && d.to >= offset + child.nodeSize,
            )
          : [];
        model.outer = outer.concat(active);
        items.push(model);
        return;
      }
      const cuts = new Set([offset, offset + child.nodeSize]);
      for (const d of inline)
        for (const point of [d.from, d.to])
          if (point > offset && point < offset + child.nodeSize)
            cuts.add(point);
      for (const d of widgets)
        if (d.from > offset && d.from < offset + child.nodeSize)
          cuts.add(d.from);
      const sorted = [...cuts].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length - 1; i++) {
        const from = sorted[i],
          to = sorted[i + 1];
        while (wi < widgets.length && widgets[wi].from <= from)
          items.push(widgetItem(widgets[wi++]));
        const active = inline.filter((d) => d.from <= from && d.to >= to);
        const text = {
          kind: "text",
          identity: child,
          start: from - offset,
          end: to - offset,
          value: child.text.slice(from - offset, to - offset),
          position: position(from),
        };
        items.push({
          kind: "segment",
          content: text,
          active,
          identity: child,
          marks: child.marks,
          position: position(from),
        });
      }
    });
    while (wi < widgets.length) items.push(widgetItem(widgets[wi++]));
    const result = [],
      markPath = [],
      containers = [result];
    for (const item of items) {
      const marks = item.marks.filter(
        (m) => this.serializer.marks[m.type.name],
      );
      let shared = 0;
      while (
        shared < markPath.length &&
        shared < marks.length &&
        markPath[shared].eq(marks[shared]) &&
        marks[shared].type.spec.spanning !== false
      )
        shared++;
      markPath.length = shared;
      containers.length = shared + 1;
      for (let i = shared; i < marks.length; i++) {
        const mark = {
          kind: "mark",
          mark: marks[i],
          identity: item.identity,
          children: [],
          position: item.position,
        };
        containers.at(-1).push(mark);
        containers.push(mark.children);
        markPath.push(marks[i]);
      }
      if (item.kind === "segment") {
        let desired = item.content;
        if (item.active.length) {
          const layers = [{ tag: "span", attrs: {} }];
          for (const d of item.active) {
            if (d.type.attrs.nodeName)
              layers.push({ tag: d.type.attrs.nodeName, attrs: {} });
            mergeAttrs(layers.at(-1).attrs, d.type.attrs);
          }
          for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            if (i === 0 && !Object.keys(layer.attrs).length) continue;
            desired = {
              kind: "inline",
              tag: layer.tag,
              attrs: layer.attrs,
              children: [desired],
              identity: item.identity,
              position: item.position,
            };
          }
        }
        containers.at(-1).push(desired);
      } else containers.at(-1).push(item);
    }
    if (
      node.isTextblock &&
      (!node.lastChild ||
        node.lastChild.type.name === "hardBreak" ||
        node.lastChild.type.name === "hard_break" ||
        (node.lastChild.isText && node.lastChild.text.endsWith("\n")))
    )
      result.push({ kind: "break", position: position(node.content.size) });
    return result;
  }
  exact(record, desired) {
    if (!this.compatible(record, desired)) return false;
    if (desired.kind === "widget") return true;
    return (
      record.identity === desired.identity &&
      (desired.kind !== "text" ||
        (record.start === desired.start && record.end === desired.end))
    );
  }
  compatible(record, desired) {
    if (record.kind !== desired.kind) return false;
    if (desired.kind === "model") return record.node.sameMarkup(desired.node);
    if (desired.kind === "mark") return record.mark.eq(desired.mark);
    if (desired.kind === "inline") return record.tag === desired.tag;
    if (desired.kind === "widget")
      return record.deco.type.eq(desired.deco.type);
    return true;
  }
  reconcile(parent, previous, desired) {
    const used = new Set(),
      reserved = new Set();
    const key = (item) =>
      item.kind === "widget"
        ? item.deco.spec.key || item.deco.type.toDOM
        : item.identity;
    const index = (values) => {
      const result = new Map();
      for (const value of values) {
        const identity = key(value),
          bucket = result.get(identity);
        if (bucket) bucket.push(value);
        else result.set(identity, [value]);
      }
      return result;
    };
    const oldByIdentity = index(previous),
      desiredByIdentity = index(desired);
    for (const record of previous)
      if (
        desiredByIdentity.get(key(record))?.some((d) => this.exact(record, d))
      )
        reserved.add(record);
    const next = [];
    try {
      for (let i = 0; i < desired.length; i++) {
        const item = desired[i];
        let record = oldByIdentity
          .get(key(item))
          ?.find((r) => !used.has(r) && this.exact(r, item));
        if (
          !record &&
          previous[i] &&
          !used.has(previous[i]) &&
          !reserved.has(previous[i]) &&
          this.compatible(previous[i], item)
        )
          record = previous[i];
        if (record) used.add(record);
        next.push(this.render(record, item));
      }
      // Insert new nodes without removing/reinserting unaffected siblings. This
      // preserves their browser state as well as their JavaScript DOM identity.
      let cursor = parent.firstChild;
      for (const record of next) {
        if (record.dom === cursor) cursor = cursor.nextSibling;
        else parent.insertBefore(record.dom, cursor);
      }
      for (const record of previous)
        if (!used.has(record)) {
          this.dispose(record);
          record.dom.remove();
        }
      return next;
    } catch (error) {
      for (const record of next)
        if (!previous.includes(record)) {
          this.dispose(record);
          record.dom.remove();
        }
      throw error;
    }
  }
  render(record, desired) {
    try {
      if (!record) {
        record = { ...desired, children: [], active: true };
        if (desired.kind === "break") {
          record.dom = this.document.createElement("br");
          record.dom.className = "ProseMirror-trailingBreak";
        } else if (desired.kind === "text")
          record.dom = this.document.createTextNode(desired.value);
        else if (desired.kind === "widget") {
          const factory = desired.deco.type.toDOM;
          record.widgetDOM =
            typeof factory === "function"
              ? factory(this.widgetHost, () =>
                  record.active ? record.position() : undefined,
                )
              : factory;
          if (!record.widgetDOM?.nodeType)
            throw new TypeError("Widget factory must return a DOM node");
          record.dom = record.widgetDOM;
          if (record.dom.nodeType !== 1) {
            record.dom = this.document.createElement("span");
            record.dom.appendChild(record.widgetDOM);
          }
          record.dom.classList.add("ProseMirror-widget");
          record.dom.contentEditable = "false";
        } else if (desired.kind === "inline") {
          record.dom = this.document.createElement(desired.tag);
          record.contentDOM = record.dom;
        } else {
          const output =
            desired.kind === "mark"
              ? this.serializer.serializeMark(desired.mark, true, {
                  document: this.document,
                })
              : nodeSpec(this.serializer, desired.node, this.document);
          record.dom = output.dom;
          record.contentDOM =
            output.contentDOM || (desired.kind === "mark" ? output.dom : null);
          if (desired.kind === "model") {
            if (
              !output.contentDOM &&
              record.dom.nodeType === 1 &&
              record.dom.nodeName !== "BR"
            )
              record.dom.contentEditable = "false";
            if (desired.node.type.spec.draggable && record.dom.nodeType === 1)
              record.dom.draggable = true;
            // Static schema controls are read-only. Scan before adding child
            // content so a caller-owned checkbox widget retains its own behavior.
            if (record.dom.firstChild)
              for (const input of record.dom.querySelectorAll?.(
                'input[type="checkbox"]',
              ) || [])
                input.disabled = true;
            record.baseDOM = record.dom;
            record.baseAttrs = snapshotAttrs(record.dom);
            record.appliedAttrs = record.baseAttrs;
          }
        }
        this.domRecords.set(record.dom, record);
        if (record.baseDOM) this.domRecords.set(record.baseDOM, record);
        if (record.contentDOM) this.domRecords.set(record.contentDOM, record);
        record.initial = true;
      }
      record.position = desired.position;
      if (desired.kind === "widget" || desired.kind === "break") return record;
      if (desired.kind === "text") {
        if (record.dom.nodeValue !== desired.value)
          record.dom.nodeValue = desired.value;
      } else if (desired.kind === "model") {
        const unchanged =
          !record.initial &&
          record.node === desired.node &&
          equalSource(record.source, desired.source);
        if (record.initial || !equalDecorations(record.outer, desired.outer))
          this.decorateNode(record, desired.outer);
        if (record.contentDOM && !unchanged)
          record.children = this.reconcile(
            record.contentDOM,
            record.children,
            this.plan(desired.node, desired.source, record),
          );
      } else {
        if (
          desired.kind === "inline" &&
          !sameAttrs(record.attrs || {}, desired.attrs)
        )
          assignAttrs(record.dom, desired.attrs, record.attrs);
        if (desired.kind === "inline" && record.initial)
          assignAttrs(record.dom, desired.attrs);
        record.children = this.reconcile(
          record.contentDOM,
          record.children,
          desired.children,
        );
      }
      const children = record.children;
      Object.assign(record, desired, { children, initial: false });
      return record;
    } catch (error) {
      if (record) this.dispose(record);
      throw error;
    }
  }
  decorateNode(record, decorations) {
    const layers = [{ attrs: { ...record.baseAttrs } }];
    for (const d of decorations) {
      if (d.type.attrs.nodeName)
        layers.push({ tag: d.type.attrs.nodeName, attrs: {} });
      mergeAttrs(layers.at(-1).attrs, d.type.attrs);
    }
    const attrs = layers[0].attrs,
      wrappers = layers.slice(1);
    assignAttrs(record.baseDOM, attrs, record.appliedAttrs);
    record.appliedAttrs = attrs;
    const oldDOM = record.dom,
      parent = oldDOM.parentNode,
      after = oldDOM.nextSibling;
    let dom = record.baseDOM;
    for (const wrapper of wrappers) {
      const outer = this.document.createElement(wrapper.tag);
      assignAttrs(outer, wrapper.attrs);
      this.domRecords.set(outer, record);
      outer.appendChild(dom);
      dom = outer;
    }
    if (oldDOM !== dom && parent) {
      parent.insertBefore(dom, after);
      if (!dom.contains(oldDOM)) oldDOM.remove();
    }
    record.dom = dom;
  }
  dispose(record) {
    if (!record.active) return;
    record.active = false;
    for (const child of record.children) this.dispose(child);
    if (record.kind === "widget" && record.widgetDOM)
      record.deco.spec.destroy?.(record.widgetDOM);
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const child of this.root.children) this.dispose(child);
    this.root.children = [];
    this.dom.remove();
  }
}
module.exports = { ReadOnlyRenderer };
