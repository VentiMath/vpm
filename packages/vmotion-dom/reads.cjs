"use strict";
const transformNames = new Set([
  "x",
  "y",
  "z",
  "translateX",
  "translateY",
  "translateZ",
  "scale",
  "scaleX",
  "scaleY",
  "scaleZ",
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "skew",
  "skewX",
  "skewY",
  "transformPerspective",
]);
const dimensional = new Set([
  "width",
  "height",
  "maxWidth",
  "maxHeight",
  "top",
  "left",
  "right",
  "bottom",
  "borderWidth",
  "borderRadius",
  "fontSize",
  "backgroundPositionX",
  "backgroundPositionY",
]);
for (const prefix of ["margin", "padding"])
  for (const suffix of [
    "",
    "Top",
    "Right",
    "Bottom",
    "Left",
    "Inline",
    "InlineStart",
    "InlineEnd",
    "Block",
    "BlockStart",
    "BlockEnd",
  ])
    dimensional.add(prefix + suffix);
for (const side of ["Top", "Right", "Bottom", "Left"])
  dimensional.add("border" + side + "Width");
for (const corner of ["TopLeft", "TopRight", "BottomLeft", "BottomRight"])
  dimensional.add("border" + corner + "Radius");
const dash = (name) => name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
function computed(element) {
  const view = element?.ownerDocument?.defaultView;
  const read = view?.getComputedStyle ?? globalThis.getComputedStyle;
  if (typeof read !== "function")
    throw new TypeError("element has no computed-style reader");
  return read.call(view ?? globalThis, element);
}
function getComputedStyle(element, name) {
  const style = computed(element);
  return String(
    style[name] ??
      style.getPropertyValue?.(name.startsWith("--") ? name : dash(name)) ??
      "",
  ).trim();
}
const defaultTransformValue = (name) => (name.startsWith("scale") ? 1 : 0);
let lastMatrix, lastValues;
function matrixValues(text) {
  if (text === lastMatrix) return lastValues;
  const match = /^matrix(3d)?\(\s*([^()]*)\s*\)$/.exec(text);
  if (!match)
    throw new TypeError("expected a computed matrix or matrix3d transform");
  const values = match[2]
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    values.length !== (match[1] ? 16 : 6) ||
    values.some((x) => !Number.isFinite(x))
  )
    throw new TypeError("invalid transform matrix");
  lastMatrix = text;
  lastValues = values;
  return values;
}
function parseValueFromTransform(transform, name) {
  if (!transform || transform === "none") return defaultTransformValue(name);
  const m = matrixValues(transform),
    three = m.length === 16;
  const angle = (x) => (x * 180) / Math.PI;
  if (name === "x" || name === "translateX") return m[three ? 12 : 4];
  if (name === "y" || name === "translateY") return m[three ? 13 : 5];
  if (name === "z" || name === "translateZ") return three ? m[14] : 0;
  const sx = Math.hypot(m[0], m[1], three ? m[2] : 0);
  const sy = three
    ? Math.hypot(m[4], m[5], m[6])
    : sx
      ? (m[0] * m[3] - m[1] * m[2]) / sx
      : Math.hypot(m[2], m[3]);
  if (name === "scaleX") return sx;
  if (name === "scaleY") return sy;
  if (name === "scale") return (sx + sy) / 2;
  if (name === "scaleZ") return three ? Math.hypot(m[8], m[9], m[10]) : 1;
  if (name === "rotate" || name === "rotateZ")
    return angle(Math.atan2(m[1], m[0]));
  if (name === "rotateX") return three ? angle(Math.atan2(m[6], m[10])) : 0;
  if (name === "rotateY")
    return three ? angle(Math.atan2(-m[2], Math.hypot(m[6], m[10]))) : 0;
  if (name === "skew" || name === "skewX")
    return three ? 0 : angle(Math.atan2(m[0] * m[2] + m[1] * m[3], sx * sx));
  if (name === "transformPerspective") return three && m[11] ? -1 / m[11] : 0;
  return defaultTransformValue(name);
}
function readTransformValue(element, name) {
  return parseValueFromTransform(getComputedStyle(element, "transform"), name);
}
function readStyleValue(element, name) {
  return transformNames.has(name)
    ? readTransformValue(element, name)
    : getComputedStyle(element, name) || 0;
}
function readSVGValue(element, name) {
  if (transformNames.has(name)) return defaultTransformValue(name);
  if (
    name.startsWith("--") ||
    [
      "opacity",
      "fill",
      "fillOpacity",
      "stroke",
      "strokeOpacity",
      "filter",
    ].includes(name)
  ) {
    const value = getComputedStyle(element, name);
    if (value) return value;
  }
  const key = /^attr[A-Z]/.test(name)
    ? name[4].toLowerCase() + name.slice(5)
    : name;
  return (
    element.getAttribute(dash(key)) ?? element.getAttribute(key) ?? undefined
  );
}
function variableParts(text) {
  if (typeof text !== "string" || !text.trim().startsWith("var(")) return;
  text = text.trim();
  if (!text.endsWith(")")) throw new TypeError("invalid CSS variable token");
  const inner = text.slice(4, -1);
  let depth = 0,
    comma = -1;
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === "(") depth++;
    else if (inner[i] === ")") depth--;
    else if (inner[i] === "," && depth === 0) {
      comma = i;
      break;
    }
    if (depth < 0) throw new TypeError("invalid CSS variable token");
  }
  const name = (comma < 0 ? inner : inner.slice(0, comma)).trim();
  if (!/^--[^\s,()]+$/.test(name))
    throw new TypeError("invalid CSS variable name");
  return [name, comma < 0 ? undefined : inner.slice(comma + 1).trim()];
}
function getVariableValue(token, element, depth = 0) {
  if (!Number.isInteger(depth) || depth < 0 || depth > 32)
    throw new RangeError("CSS variable nesting exceeds 32 levels");
  const parts = variableParts(token);
  if (!parts) return undefined;
  const [name, fallback] = parts;
  let value = getComputedStyle(element, name) || fallback;
  if (value === undefined || value === "") return undefined;
  if (value.startsWith("var("))
    return getVariableValue(value, element, depth + 1);
  const number = Number(value);
  return Number.isFinite(number) && value.trim() !== "" ? number : value;
}
function fillWildcards(frames) {
  for (let i = 1; i < frames.length; i++)
    if (frames[i] === null) frames[i] = frames[i - 1];
}
function applyPxDefaults(frames, name) {
  if (!dimensional.has(name)) return;
  for (let i = 0; i < frames.length; i++)
    if (typeof frames[i] === "number") frames[i] += "px";
}
module.exports = {
  defaultTransformValue,
  parseValueFromTransform,
  readTransformValue,
  getComputedStyle,
  readStyleValue,
  readSVGValue,
  getVariableValue,
  fillWildcards,
  applyPxDefaults,
};
