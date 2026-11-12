"use strict";
const banned = new Set(["__proto__", "prototype", "constructor"]);
const pathCache = new Map();
function parts(name) {
  if (typeof name !== "string" || !name)
    throw new TypeError("field name must be a nonempty string");
  const cached = pathCache.get(name);
  if (cached) return cached;
  const p = name.replace(/\[(\d+)\]/g, ".$1").split(".");
  if (
    p.some(
      (k) =>
        !k ||
        banned.has(k) ||
        /[\[\]]/.test(k) ||
        (/^\d+$/.test(k) && Number(k) > 100000),
    )
  )
    throw new TypeError("unsafe field path");
  if (pathCache.size >= 512) pathCache.clear();
  pathCache.set(name, Object.freeze(p));
  return p;
}
function get(object, name, fallback) {
  if (!name) return fallback;
  const keys = parts(name);
  let value = object;
  for (const k of keys) {
    if (value == null || !Object.hasOwn(value, k)) {
      value = undefined;
      break;
    }
    value = value[k];
  }
  if (value === undefined && object && Object.hasOwn(object, name))
    value = object[name];
  return value === undefined ? fallback : value;
}
function set(object, name, value) {
  const keys = parts(name);
  let node = object;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) node[k] = value;
    else {
      if (!Object.hasOwn(node, k) || !node[k] || typeof node[k] !== "object")
        node[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      node = node[k];
    }
  });
  return object;
}
function unset(object, name) {
  const keys = parts(name),
    parents = [];
  let node = object;
  for (const k of keys) {
    if (!node || typeof node !== "object" || !Object.hasOwn(node, k)) return;
    parents.push([node, k]);
    node = node[k];
  }
  for (let i = parents.length - 1; i >= 0; i--) {
    const [o, k] = parents[i];
    delete o[k];
    if (Object.keys(o).length) break;
  }
}
function clone(value, seen = new Map()) {
  if (!value || typeof value !== "object") return value;
  if (value instanceof Date) return new Date(value);
  if (
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) !== Object.prototype &&
    Object.getPrototypeOf(value) !== null
  )
    return value;
  if (seen.has(value)) throw new TypeError("form values must not be cyclic");
  const out = Array.isArray(value) ? new Array(value.length) : {};
  seen.set(value, out);
  for (const k of Object.keys(value)) {
    if (banned.has(k)) throw new TypeError("unsafe form value key");
    out[k] = clone(value[k], seen);
  }
  seen.delete(value);
  return out;
}
function equal(a, b) {
  if (Object.is(a, b)) return true;
  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && a.length !== b.length) return false;
  if (
    ![Object.prototype, null, Array.prototype].includes(
      Object.getPrototypeOf(a),
    ) ||
    ![Object.prototype, null, Array.prototype].includes(
      Object.getPrototypeOf(b),
    )
  )
    return false;
  const ka = Object.keys(a),
    kb = Object.keys(b);
  return (
    ka.length === kb.length &&
    ka.every((k) => Object.hasOwn(b, k) && equal(a[k], b[k]))
  );
}
function dirty(value, defaults) {
  if (equal(value, defaults)) return undefined;
  if (
    value &&
    typeof value === "object" &&
    (Array.isArray(value) ||
      [Object.prototype, null].includes(Object.getPrototypeOf(value)))
  ) {
    const out = Array.isArray(value) ? [] : {};
    for (const k of new Set([
      ...Object.keys(value),
      ...Object.keys(defaults || {}),
    ])) {
      const d = dirty(value[k], defaults?.[k]);
      if (d !== undefined) out[k] = d;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return true;
}
const related = (a, b) => {
  if (a.includes("[") || b.includes("[")) {
    a = parts(a).join(".");
    b = parts(b).join(".");
  }
  return a === b || a.startsWith(b + ".") || b.startsWith(a + ".");
};
module.exports = { parts, get, set, unset, clone, equal, dirty, related };
