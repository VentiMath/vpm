"use strict";

// Independent object-style serializer and per-target stylesheet ownership.
// Notistack uses css(object) only; the styled/template compiler is not shipped.
const marker = "\0";
const serverTarget = { data: "" };
const sheets = new WeakMap();
const compiled = new Map();
const forbidden = new Set(["__proto__", "prototype", "constructor"]);
function scalar(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("CSS numbers must be finite");
    return String(value);
  }
  if (typeof value !== "string" || value.includes(marker))
    throw new TypeError("CSS values must be strings or finite numbers");
  return value;
}
function property(key) {
  if (forbidden.has(key) || !/^(?:--[\w-]+|-?[a-zA-Z][\w-]*)$/.test(key))
    throw new TypeError("invalid CSS property: " + key);
  return key.startsWith("--") ? key : key.replace(/[A-Z]/g, c => "-" + c.toLowerCase()).replace(/^ms-/, "-ms-");
}
function selectors(text) {
  const parts = [];
  let start = 0, depth = 0, quote;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\\") { i++; continue; }
    if (quote) { if (c === quote) quote = undefined; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") { if (--depth < 0) throw new TypeError("unbalanced selector"); }
    else if (c === "," && !depth) { parts.push(text.slice(start, i).trim()); start = i + 1; }
  }
  parts.push(text.slice(start).trim());
  if (depth || quote || parts.some(x => !x)) throw new TypeError("invalid selector");
  return parts;
}
function substitute(selector, parent) {
  let out = "", quote, replaced = false;
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i];
    if (c === "\\") { out += c + (selector[++i] ?? ""); continue; }
    if (quote) { if (c === quote) quote = undefined; out += c; continue; }
    if (c === "'" || c === '"') quote = c;
    if (c === "&") { out += parent; replaced = true; } else out += c;
  }
  return replaced ? out : parent + " " + out;
}
function nested(parent, key) {
  return selectors(parent).flatMap(p => selectors(key).map(k => substitute(k, p))).join(",");
}
function merge(input, stack = new Set(), depth = 0, out = Object.create(null)) {
  if (depth > 128) throw new RangeError("style nesting exceeds 128 levels");
  if (input == null || input === false) return out;
  if (typeof input !== "object") throw new TypeError("css supports object styles and object arrays");
  if (stack.has(input)) throw new TypeError("cyclic styles");
  stack.add(input);
  if (Array.isArray(input)) {
    for (const item of input) merge(item, stack, depth + 1, out);
  } else for (const key of Object.keys(input)) {
    if (forbidden.has(key) || key.includes(marker)) throw new TypeError("unsafe style key");
    const value = input[key];
    if (value == null || value === false) continue;
    if (typeof value === "object") {
      if (Array.isArray(value)) throw new TypeError("property fallback arrays are not supported");
      out[key] = merge(value, stack, depth + 1, typeof out[key] === "object" ? out[key] : Object.create(null));
    } else out[key] = scalar(value);
  }
  stack.delete(input);
  return out;
}
function serialize(record, scope) {
  let declarations = "", children = "";
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (typeof value === "string") declarations += property(key) + ":" + value + ";";
    else if (/^@(media|supports|container|layer)(?:\s|\()/.test(key))
      children += key + "{" + serialize(value, scope) + "}";
    else if (key.startsWith("@")) throw new TypeError("unsupported nested at-rule: " + key);
    else children += serialize(value, nested(scope, key));
  }
  return (declarations ? scope + "{" + declarations + "}" : "") + children;
}
function fingerprint(text) {
  let a = 2166136261, b = 5381;
  for (let i = 0; i < text.length; i++) { const n = text.charCodeAt(i); a = Math.imul(a ^ n, 16777619); b = Math.imul(b, 33) ^ n; }
  return "vg" + (a >>> 0).toString(36) + (b >>> 0).toString(36);
}
function targetFor(target) {
  target ??= globalThis.document?.head ?? serverTarget;
  if (!target || typeof target !== "object") throw new TypeError("invalid style target");
  if (target.nodeType === 9) target = target.head;
  return target;
}
function sheetFor(target) {
  let state = sheets.get(target);
  const doc = target.ownerDocument;
  if (state && (!state.element || state.element.parentNode === target || state.element === target)) return state;
  let element;
  if (doc) {
    element = target.localName === "style" ? target : Array.from(target.children || []).find(x => x.localName === "style" && x.id === "_vgoober");
    if (!element) {
      element = doc.createElement("style"); element.id = "_vgoober";
      const nonce = doc.defaultView?.__nonce__;
      if (nonce) element.setAttribute("nonce", nonce);
      target.appendChild(element);
    }
  } else if (typeof target.data !== "string") throw new TypeError("SSR style targets require a data string");
  state = { element, names: new Map(), hydratedText: element ? element.textContent : target.data };
  sheets.set(target, state);
  return state;
}
function css(...inputs) {
  const record = merge(inputs.length === 1 ? inputs[0] : inputs);
  const key = JSON.stringify(record);
  let prepared = compiled.get(key);
  if (!prepared) {
    const text = serialize(record, "." + marker);
    prepared = { name: fingerprint(text), text };
    if (compiled.size >= 128) compiled.delete(compiled.keys().next().value);
    compiled.set(key, prepared);
  }
  const text = prepared.text;
  const target = targetFor(this?.target), state = sheetFor(target);
  let name = prepared.name, suffix = 0;
  while (state.names.has(name) && state.names.get(name) !== text) name = prepared.name + "-" + ++suffix;
  if (!state.names.has(name)) {
    const output = text.replaceAll(marker, name);
    // Exact rule matching also recognizes CSS emitted by a VPM SSR render.
    if (output && !state.hydratedText.includes(output)) {
      if (state.element) state.element.appendChild(state.element.ownerDocument.createTextNode(output));
      else target.data += output;
    }
    state.names.set(name, text);
  }
  return name;
}
function extractCss(target) {
  target = targetFor(target);
  const state = sheetFor(target), text = state.element ? state.element.textContent : target.data;
  if (state.element) state.element.textContent = "";
  else target.data = "";
  state.hydratedText = ""; state.names.clear();
  return text;
}
module.exports = { css, extractCss };
