'use strict';
const {isProxy} = require('node:util').types;
const hasOwn = Object.hasOwn;
const objectSource = Function.prototype.toString.call(Object);

function plain(value) {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  if (proto === null || proto === Object.prototype) return true;
  if (Object.getPrototypeOf(proto) !== null) return false;
  const ctor = Object.getOwnPropertyDescriptor(proto, 'constructor')?.value;
  return typeof ctor === 'function' && Function.prototype.toString.call(ctor) === objectSource;
}

function keys(value) {
  const result = Object.keys(value);
  for (const key of Object.getOwnPropertySymbols(value)) {
    if (Object.prototype.propertyIsEnumerable.call(value, key)) result.push(key);
  }
  return result;
}

function assign(target, key, value, proxy) {
  // New ordinary fields need no ownership lookup. Proxies keep the original
  // descriptor-before-has trap order, including skipping `has` for own fields.
  const inherited = key === '__proto__' || (proxy
    ? !hasOwn(target, key) && key in target
    : key in target && !hasOwn(target, key));
  if (inherited) {
    Object.defineProperty(target, key, {value, writable: true, enumerable: true, configurable: true});
  } else {
    target[key] = value;
  }
}

function deepMerge(root, target, targetProxy) {
  let input = root;
  let output = target;
  let proxy = targetProxy;
  let fields = keys(input);
  let index = 0;
  let stack, sources, destinations, memo;

  for (;;) {
    if (index === fields.length) {
      if (!stack || !stack.length) return;
      const frame = stack.pop();
      input = frame.input;
      output = frame.output;
      proxy = frame.proxy;
      fields = frame.fields;
      index = frame.index;
      continue;
    }
    const key = fields[index++];
    // A preceding getter can remove a snapshotted key and reveal an inherited
    // property. Never copy that inherited replacement.
    if (!hasOwn(input, key)) continue;
    const value = input[key];
    if (value === undefined || value === output) continue;
    if (value === null || typeof value !== 'object') {
      assign(output, key, value, proxy);
      continue;
    }
    const array = Array.isArray(value);
    if (!array && !plain(value)) {
      assign(output, key, value, proxy);
      continue;
    }

    // Small option records rarely need a hash table. Root cycles are free to
    // recognize; eight retained identities bound the linear-search path.
    let known;
    if (value === root) known = target;
    else if (memo) known = memo.get(value);
    else if (sources) {
      const found = sources.indexOf(value);
      if (found !== -1) known = destinations[found];
    }
    if (known !== undefined) {
      assign(output, key, known, proxy);
      continue;
    }
    const previous = hasOwn(output, key) ? output[key] : undefined;
    const clone = array ? (Array.isArray(previous) ? previous : []) : (plain(previous) ? previous : {});
    if (memo) memo.set(value, clone);
    else if (!sources) {
      sources = [value];
      destinations = [clone];
    } else if (sources.length < 8) {
      sources.push(value);
      destinations.push(clone);
    } else {
      memo = new Map();
      for (let i = 0; i < sources.length; i++) memo.set(sources[i], destinations[i]);
      memo.set(value, clone);
      sources = destinations = undefined;
    }
    assign(output, key, clone, proxy);

    // Save only parents with work remaining. A single-child chain needs no
    // traversal stack, and flat merges allocate neither frames nor a memo.
    if (index < fields.length) {
      if (!stack) stack = [];
      stack.push({input, output, proxy, fields, index});
    }
    input = value;
    output = clone;
    proxy = isProxy(clone);
    fields = keys(value);
    index = 0;
  }
}

function extend() {
  let target = arguments[0];
  let deep = false;
  let index = 1;
  if (typeof target === 'boolean') {
    deep = target;
    target = arguments[1];
    index = 2;
  }
  if (target === null || typeof target !== 'object' && typeof target !== 'function') target = {};
  const proxy = isProxy(target);
  for (; index < arguments.length; index++) {
    const source = arguments[index];
    if (source == null) continue;
    const input = Object(source);
    if (deep) {
      deepMerge(input, target, proxy);
      continue;
    }
    for (const key of keys(input)) {
      if (!hasOwn(input, key)) continue;
      const value = input[key];
      if (value !== undefined && value !== target) assign(target, key, value, proxy);
    }
  }
  return target;
}
module.exports = extend;
