"use strict";
const { transform } = require("vcssjanus");
// Weak ownership follows the AST lifetime; no CSS strings or documents are cached.
const prepared = new WeakSet(),
  changed = new WeakSet(),
  ignored = new WeakSet();
function blocked(node) {
  for (let p = node; p; p = p.parent) if (ignored.has(p)) return true;
  return false;
}
function flip(node) {
  if (node.type !== "decl" || changed.has(node)) return;
  changed.add(node);
  if (blocked(node)) return;
  const result = transform(node.value);
  if (result === node.value) return;
  const colon = result.indexOf(":");
  node.value = result;
  node.props = result.slice(0, colon);
  node.children = result.slice(
    colon + 1,
    result.endsWith(";") ? -1 : undefined,
  );
  node.length = colon;
  node.return = "";
}
function prepare(list) {
  if (!Array.isArray(list) || prepared.has(list)) return;
  const pending = [list],
    nodes = [],
    seen = new Set();
  let annotations = false;
  while (pending.length) {
    const group = pending.pop();
    if (prepared.has(group)) continue;
    prepared.add(group);
    for (const node of group) {
      if (seen.has(node)) continue;
      seen.add(node);
      nodes.push(node);
      if (node.type === "comm" && /@noflip\b/.test(node.value))
        annotations = true;
      if (Array.isArray(node.children)) pending.push(node.children);
    }
  }
  if (annotations) {
    // Stylis lifts nested rules out of their parent's child array. Restore source
    // order only for annotation binding; the caller's arrays and nodes stay put.
    const siblings = new Map();
    for (const node of nodes) {
      const parent = node.parent || null;
      let group = siblings.get(parent);
      if (!group) siblings.set(parent, (group = []));
      group.push(node);
    }
    for (const group of siblings.values()) {
      group.sort((a, b) => a.line - b.line || a.column - b.column);
      let next = false;
      for (const node of group) {
        if (node.type === "comm") {
          next ||= /@noflip\b/.test(node.value);
          continue;
        }
        if (next) {
          ignored.add(node);
          next = false;
        }
      }
    }
  }
  for (const node of nodes) flip(node);
}
function stylisRTLPlugin(element, index, children) {
  prepare(children);
  // Also support middleware-created nodes that were not in the initial list.
  if (Array.isArray(element.children)) prepare(element.children);
  flip(element);
}
Object.defineProperty(stylisRTLPlugin, "name", { value: "stylisRTLPlugin" });
module.exports = stylisRTLPlugin;
Object.defineProperty(module.exports, "default", { value: stylisRTLPlugin });
