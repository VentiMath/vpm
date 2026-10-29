'use strict';
// Capture native JSON operations: some consumers replace globalThis.JSON.
const nativeParse = JSON.parse, nativeStringify = JSON.stringify;
const {types} = require('node:util');
const exactSources = new WeakMap();
const numberSyntax = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/;
const numberToken = /-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/y;
const control = /[\u0000-\u001f]/;
const needsEscaping = /["\\\u0000-\u001f\ud800-\udfff]/;
function quote(value) { return needsEscaping.test(value) ? nativeStringify(value) : '"' + value + '"'; }
function exact(source) { const value = Object.create(ExactNumber.prototype); exactSources.set(value, source); return Object.freeze(value); }
function sourceOf(value) { const source = exactSources.get(value); if (source === undefined) throw new TypeError('Invalid ExactNumber receiver'); return source; }
class ExactNumber {
  constructor(source) {
    if (typeof source !== 'string' || source.length > 100000 || !numberSyntax.test(source)) throw new TypeError('ExactNumber requires a JSON number of at most 100000 characters');
    return exact(source);
  }
  toString() { return sourceOf(this); }
  valueOf() { return sourceOf(this); }
  toJSON() { return sourceOf(this); }
}
function canonical(source) {
  const match = /^(-?)([0-9]+)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$/.exec(source);
  let digits = (match[2] + (match[3] || '')).replace(/^0+/, '');
  if (!digits) return {sign: '', digits: '0', power: 0};
  const trimmed = digits.replace(/0+$/, '');
  const power = Number(match[4] || 0) - (match[3]?.length || 0) + digits.length - trimmed.length;
  return {sign: match[1], digits: trimmed, power};
}
function sameNumber(a, b) { return a.sign === b.sign && a.digits === b.digits && a.power === b.power; }
function numberValue(source, options) {
  if (source.length > options.maxNumberLength) throw new RangeError('JSON number exceeds maxNumberLength');
  const value = Number(source), integerLiteral = !/[.eE]/.test(source);
  let large = options.alwaysParseAsBig, normalized;
  if (!large) {
    if (integerLiteral) large = !Number.isSafeInteger(value);
    else {
      normalized = canonical(source);
      large = !Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)) || !sameNumber(normalized, canonical(String(value)));
    }
  }
  if (!large) return value;
  if (options.storeAsString) return source;
  if (options.useNativeBigInt) {
    if (integerLiteral) return BigInt(source);
    normalized ??= canonical(source);
    if (normalized.power >= 0 && normalized.digits.length + normalized.power <= options.maxNumberLength) return BigInt(normalized.sign + normalized.digits + '0'.repeat(normalized.power));
  }
  return exact(source);
}
function bound(value, fallback, name, max) {
  value ??= fallback;
  if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new TypeError('Invalid ' + name + ' limit');
  return value;
}
function configuration(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Options must be an object');
  const options = {};
  for (const name of ['strict', 'storeAsString', 'alwaysParseAsBig', 'useNativeBigInt']) {
    if (input[name] !== undefined && typeof input[name] !== 'boolean') throw new TypeError(name + ' must be a boolean');
    options[name] = input[name] ?? false;
  }
  for (const name of ['protoAction', 'constructorAction']) {
    options[name] = input[name] ?? 'error';
    if (!['error', 'ignore', 'preserve'].includes(options[name])) throw new TypeError('Invalid ' + name + ' option');
  }
  options.maxDepth = bound(input.maxDepth, 512, 'maxDepth', 1024);
  options.maxLength = bound(input.maxLength, 16 * 1024 * 1024, 'maxLength', 0x3fffffff);
  options.maxNumberLength = bound(input.maxNumberLength, 100000, 'maxNumberLength', 100000);
  return Object.freeze(options);
}
function parseWith(source, reviver, options) {
  const text = typeof source === 'string' ? source : source + '';
  if (text.length > options.maxLength) throw new RangeError('JSON input exceeds maxLength');
  let at = 0;
  function error(message = 'Invalid JSON') { const error = new SyntaxError(message + ' at position ' + at); error.position = at; throw error; }
  function white() { while (at < text.length) { const c = text.charCodeAt(at); if (c !== 32 && c !== 9 && c !== 10 && c !== 13) break; at++; } }
  function string() {
    const begin = at++, start = at;
    let end = text.indexOf('"', start);
    if (end < 0) error();
    const simple = text.slice(start, end);
    if (!simple.includes('\\')) {
      if (control.test(simple)) error();
      at = end + 1; return simple;
    }
    while (at < text.length) {
      const c = text.charCodeAt(at++);
      if (c === 34) {
        try { return nativeParse(text.slice(begin, at)); } catch { error(); }
      }
      if (c === 92) at++;
      else if (c < 32) error();
    }
    error();
  }
  function value(depth) {
    white(); const c = text.charCodeAt(at);
    if (c === 34) return string();
    if (c === 123 || c === 91) {
      if (depth >= options.maxDepth) throw new RangeError('JSON nesting exceeds maxDepth');
      const object = c === 123, result = object ? Object.create(null) : [];
      const closing = object ? 125 : 93, seen = object && options.strict ? new Set() : undefined;
      at++; white(); if (text.charCodeAt(at) === closing) { at++; return result; }
      while (at < text.length) {
        let key, action;
        if (object) {
          if (text.charCodeAt(at) !== 34) error();
          key = string(); white(); if (text.charCodeAt(at++) !== 58) error();
          if (seen) { if (seen.has(key)) error('Duplicate object key'); seen.add(key); }
          action = key === '__proto__' ? options.protoAction : key === 'constructor' ? options.constructorAction : 'preserve';
          if (action === 'error') error(key === '__proto__' ? 'Object contains forbidden prototype property' : 'Object contains forbidden constructor property');
        }
        const child = value(depth + 1);
        if (object) { if (action !== 'ignore') result[key] = child; } else result.push(child);
        white(); const next = text.charCodeAt(at++);
        if (next === closing) return result;
        if (next !== 44) error();
        white();
      }
      error();
    }
    if (c === 45 || (c >= 48 && c <= 57)) {
      numberToken.lastIndex = at;
      const match = numberToken.exec(text); if (!match) error();
      at = numberToken.lastIndex; return numberValue(match[0], options);
    }
    for (const [word, result] of [['true', true], ['false', false], ['null', null]]) {
      if (text.startsWith(word, at)) { at += word.length; return result; }
    }
    error();
  }
  const result = value(0); white(); if (at !== text.length) error();
  if (typeof reviver !== 'function') return result;
  const ancestors = new Set();
  function walk(holder, key, depth) {
    let value = holder[key];
    if (value && typeof value === 'object' && !exactSources.has(value)) {
      if (depth >= options.maxDepth || ancestors.has(value)) throw new RangeError('JSON reviver traversal exceeds its bounds');
      ancestors.add(value);
      for (const child of Object.keys(value)) {
        const replacement = walk(value, child, depth + 1);
        if (replacement === undefined) delete value[child]; else Object.defineProperty(value, child, {value: replacement, enumerable: true, writable: true, configurable: true});
      }
      ancestors.delete(value);
    }
    return reviver.call(holder, key, value);
  }
  return walk({'': result}, '', 0);
}
function stringifyWith(input, replacer, space, options) {
  let gap = '', keys;
  const replacerFunction = typeof replacer === 'function' ? replacer : undefined;
  if (Array.isArray(replacer)) {
    keys = []; const seen = new Set();
    for (let item of replacer) {
      if (types.isStringObject(item)) item = String.prototype.valueOf.call(item);
      else if (types.isNumberObject(item)) item = Number.prototype.valueOf.call(item);
      if (typeof item !== 'string' && typeof item !== 'number') continue;
      item = String(item); if (!seen.has(item)) { seen.add(item); keys.push(item); }
    }
  }
  if (types.isNumberObject(space)) space = Number.prototype.valueOf.call(space);
  if (types.isStringObject(space)) space = String.prototype.valueOf.call(space);
  if (typeof space === 'number') gap = ' '.repeat(Math.min(10, Math.max(0, Math.trunc(space) || 0)));
  else if (typeof space === 'string') gap = space.slice(0, 10);
  const ancestors = new Set();
  function serialize(holder, key, depth) {
    let value = holder[key];
    if (value !== null && (typeof value === 'object' || typeof value === 'bigint') && !exactSources.has(value)) {
      const method = value.toJSON; if (typeof method === 'function') value = method.call(value, key);
    }
    if (replacerFunction) value = replacerFunction.call(holder, key, value);
    if (value && typeof value === 'object') {
      const source = exactSources.get(value); if (source !== undefined) return source;
      if (types.isBoxedPrimitive(value)) {
        if (types.isNumberObject(value)) value = Number.prototype.valueOf.call(value);
        else if (types.isStringObject(value)) value = String.prototype.valueOf.call(value);
        else if (types.isBooleanObject(value)) value = Boolean.prototype.valueOf.call(value);
        else if (types.isBigIntObject(value)) value = BigInt.prototype.valueOf.call(value);
      }
    }
    switch (typeof value) {
      case 'string': return quote(value);
      case 'number': return Number.isFinite(value) ? String(value) : 'null';
      case 'bigint': return String(value);
      case 'boolean': return value ? 'true' : 'false';
      case 'undefined': case 'function': case 'symbol': return undefined;
    }
    if (value === null) return 'null';
    if (depth >= options.maxDepth) throw new RangeError('JSON nesting exceeds maxDepth');
    if (ancestors.has(value)) throw new TypeError('Cannot serialize a circular structure');
    ancestors.add(value);
    const array = Array.isArray(value), parts = [], prefix = gap.repeat(depth + 1), suffix = gap.repeat(depth);
    if (array) {
      const length = value.length;
      for (let i = 0; i < length; i++) parts.push(serialize(value, String(i), depth + 1) ?? 'null');
    } else {
      for (const name of keys || Object.keys(value)) {
        const part = serialize(value, name, depth + 1);
        if (part !== undefined) parts.push(quote(name) + (gap ? ': ' : ':') + part);
      }
    }
    ancestors.delete(value);
    const left = array ? '[' : '{', right = array ? ']' : '}';
    return !parts.length ? left + right : gap ? left + '\n' + prefix + parts.join(',\n' + prefix) + '\n' + suffix + right : left + parts.join(',') + right;
  }
  return serialize({'': input}, '', 0);
}
function JSONBig(options) {
  const config = configuration(options);
  return Object.freeze({parse: (source, reviver) => parseWith(source, reviver, config), stringify: (value, replacer, space) => stringifyWith(value, replacer, space, config)});
}
const defaults = JSONBig();
module.exports = JSONBig;
module.exports.parse = defaults.parse;
module.exports.stringify = defaults.stringify;
module.exports.ExactNumber = ExactNumber;
module.exports.isExactNumber = value => value !== null && typeof value === 'object' && exactSources.has(value);
