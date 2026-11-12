"use strict";
const own = (o, k) => o != null && Object.hasOwn(o, k);
const dataObject = () => Object.create(null);
function copy(value, seen = new Set(), depth = 0) {
  if (value === null || typeof value !== "object") return value;
  if (depth > 128 || seen.has(value))
    throw new TypeError(
      "Translation resources must be acyclic and at most 128 levels deep",
    );
  seen.add(value);
  const out = Array.isArray(value) ? [] : {};
  for (const key of Object.keys(value))
    Object.defineProperty(out, key, {
      value: copy(value[key], seen, depth + 1),
      writable: true,
      enumerable: true,
      configurable: true,
    });
  seen.delete(value);
  return out;
}
function get(object, key, separator = ".") {
  if (own(object, key)) return object[key];
  if (!separator) return undefined;
  const parts = key.split(separator);
  let current = object;
  for (let i = 0; i < parts.length; i++) {
    if (!own(current, parts[i])) {
      const remainder = parts.slice(i).join(separator);
      return own(current, remainder) ? current[remainder] : undefined;
    }
    current = current[parts[i]];
  }
  return current;
}
function set(object, key, value, separator = ".") {
  const parts = separator ? key.split(separator) : [key];
  let target = object;
  for (const part of parts.slice(0, -1)) {
    if (
      !own(target, part) ||
      target[part] === null ||
      typeof target[part] !== "object"
    )
      Object.defineProperty(target, part, {
        value: dataObject(),
        writable: true,
        enumerable: true,
        configurable: true,
      });
    target = target[part];
  }
  Object.defineProperty(target, parts.at(-1), {
    value: copy(value),
    writable: true,
    enumerable: true,
    configurable: true,
  });
}
function merge(target, source, deep, overwrite) {
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (
      deep &&
      own(target, key) &&
      target[key] &&
      value &&
      typeof target[key] === "object" &&
      typeof value === "object" &&
      !Array.isArray(value)
    )
      merge(target[key], value, true, overwrite);
    else if (!deep || overwrite || !own(target, key))
      Object.defineProperty(target, key, {
        value: copy(value),
        writable: true,
        enumerable: true,
        configurable: true,
      });
  }
  return target;
}
class Events {
  constructor() {
    this._listeners = new Map();
  }
  on(events, fn) {
    for (const event of events.split(/\s+/).filter(Boolean)) {
      let list = this._listeners.get(event);
      if (!list) this._listeners.set(event, (list = []));
      list.push(fn);
    }
    return this;
  }
  off(events, fn) {
    for (const event of events.split(/\s+/)) {
      if (!fn) this._listeners.delete(event);
      else {
        const list = this._listeners.get(event);
        if (list)
          this._listeners.set(
            event,
            list.filter((f) => f !== fn),
          );
      }
    }
    return this;
  }
  once(event, fn) {
    const cb = (...args) => {
      this.off(event, cb);
      fn(...args);
    };
    return this.on(event, cb);
  }
  emit(event, ...args) {
    for (const fn of [...(this._listeners.get(event) || [])]) fn(...args);
    for (const fn of [...(this._listeners.get("*") || [])]) fn(event, ...args);
  }
}
module.exports = { own, dataObject, copy, get, set, merge, Events };
