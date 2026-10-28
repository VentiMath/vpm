'use strict';
// Derived from path-to-regexp 8.4.2 (MIT); see LICENSE and PROVENANCE.json.
const lower = require('./regex.cjs');
const ID = /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u;
const ID_CONTINUE = /^[$\u200c\u200d\p{ID_Continue}]$/u;
const NAME = /[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*/uy;
const MAX_DEPTH = 128;
const identity = value => value;
function encodeComponent(value) {
  return /[^A-Za-z0-9_.!~*'()-]/.test(value) ? encodeURIComponent(value) : value;
}
const escapeRegex = value => value.replace(/[.+*?^${}()[\]|/\\]/g, '\\$&');

class TokenData {
  constructor(tokens, originalPath) { this.tokens = tokens; this.originalPath = originalPath; }
}
class PathError extends TypeError {
  constructor(message, originalPath) {
    super(message + (originalPath ? ': ' + originalPath : '') + '; visit https://git.new/pathToRegexpError for info');
    this.originalPath = originalPath;
  }
}
exports.TokenData = TokenData;
exports.PathError = PathError;
exports.parse = parse;
exports.compile = compile;
exports.match = match;
exports.pathToRegexp = pathToRegexp;
exports.stringify = stringify;
Object.freeze(exports);

function object(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(label + ' must be an object');
}
function string(value, label) {
  if (typeof value !== 'string') throw new TypeError(label + ' must be a string');
  return value;
}
function callback(value, fallback, label, allowFalse = false) {
  if (value === undefined) return fallback;
  if (typeof value === 'function' || (allowFalse && value === false)) return value;
  throw new TypeError(label + ' must be a function' + (allowFalse ? ' or false' : ''));
}
function settings(options, mode) {
  object(options, 'options');
  const encodePath = callback(options.encodePath, identity, 'encodePath');
  if (mode === 'parse') return { encodePath };
  const supplied = options.delimiter;
  const delimiter = supplied === undefined ? '/' : string(supplied, 'delimiter');
  if (!delimiter) throw new TypeError('delimiter must not be empty');
  if (mode === 'compile') return { encodePath, delimiter, encode: callback(options.encode, encodeURIComponent, 'encode', true) };
  const result = { encodePath, delimiter };
  for (const name of ['end', 'sensitive', 'trailing']) {
    const value = options[name];
    if (value !== undefined && typeof value !== 'boolean') throw new TypeError(name + ' must be a boolean');
    result[name] = value === undefined ? name !== 'sensitive' : value;
  }
  if (mode === 'match') result.decode = callback(options.decode, decodeURIComponent, 'decode', true);
  return result;
}

function parse(str, options = {}) {
  string(str, 'path');
  return new TokenData(parseTokens(str, settings(options, 'parse').encodePath), str);
}
function parseTokens(str, encodePath) {
  const specials = /[\\:*{}()[\]+?!]/g;
  let index = 0;
  // Error offsets retain upstream's Unicode-code-point indexing.
  const offset = value => Array.from(str.slice(0, value)).length;
  function consume(end, depth) {
    if (depth > MAX_DEPTH) throw new PathError('Too much nesting (maximum 128)', str);
    const tokens = [];
    let text = '';
    function write() {
      if (text) { tokens.push({ type: 'text', value: string(encodePath(text), 'encodePath result') }); text = ''; }
    }
    while (index < str.length) {
      specials.lastIndex = index;
      const found = specials.exec(str);
      if (!found) { text += str.slice(index); index = str.length; break; }
      text += str.slice(index, found.index);
      index = found.index + 1;
      const c = found[0];
      if (c === end) { write(); return tokens; }
      if (c === '\\') {
        if (index === str.length) throw new PathError('Unexpected end after \\ at index ' + offset(index), str);
        const size = str.codePointAt(index) > 0xffff ? 2 : 1;
        text += str.slice(index, index + size); index += size;
      } else if (c === ':' || c === '*') {
        let name = '';
        NAME.lastIndex = index;
        const identifier = NAME.exec(str);
        if (identifier) { name = identifier[0]; index = NAME.lastIndex; }
        else if (str[index] === '"') {
          const quoteStart = index++;
          let start = index, closed = false;
          while (index < str.length) {
            if (str[index] === '"') { name += str.slice(start, index++); closed = true; break; }
            if (str[index] === '\\') {
              name += str.slice(start, index++);
              if (index === str.length) break;
              const size = str.codePointAt(index) > 0xffff ? 2 : 1;
              name += str.slice(index, index + size); index += size; start = index;
            } else index++;
          }
          if (!closed) throw new PathError('Unterminated quote at index ' + offset(quoteStart), str);
        }
        if (!name) throw new PathError('Missing parameter name at index ' + offset(index), str);
        write(); tokens.push({ type: c === ':' ? 'param' : 'wildcard', name });
      } else if (c === '{') {
        write(); tokens.push({ type: 'group', tokens: consume('}', depth + 1) });
      } else throw new PathError('Unexpected ' + c + ' at index ' + offset(index - 1), str);
    }
    if (end) throw new PathError('Unexpected end at index ' + offset(index) + ', expected ' + end, str);
    write(); return tokens;
  }
  return consume('', 0);
}

// Copy external token graphs once. No compiled closure retains caller state.
function dataFor(path, encodePath) {
  if (typeof path === 'string') return { tokens: parseTokens(path, encodePath), originalPath: path };
  object(path, 'path');
  const originalPath = path.originalPath;
  if (originalPath !== undefined) string(originalPath, 'originalPath');
  const active = new Set();
  function copy(tokens, depth) {
    if (!Array.isArray(tokens)) throw new TypeError('tokens must be an array');
    if (depth > MAX_DEPTH) throw new PathError('Too much nesting (maximum 128)', originalPath);
    if (active.has(tokens)) throw new PathError('Cyclic token data', originalPath);
    active.add(tokens);
    const length = tokens.length, result = [];
    if (!Number.isInteger(length) || length < 0 || length > 0xffffffff) throw new TypeError('invalid tokens length');
    for (let i = 0; i < length; i++) {
      if (!Object.hasOwn(tokens, i)) throw new TypeError('tokens must have own entries');
      const token = tokens[i]; object(token, 'token');
      const type = token.type;
      if (type === 'text') result.push({ type, value: string(token.value, 'text value') });
      else if (type === 'group') result.push({ type, tokens: copy(token.tokens, depth + 1) });
      else if (type === 'param' || type === 'wildcard') {
        const name = string(token.name, 'parameter name');
        if (!name) throw new TypeError('parameter name must not be empty');
        result.push({ type, name });
      } else throw new TypeError('Unknown token type: ' + String(type));
    }
    active.delete(tokens); return result;
  }
  return { tokens: copy(path.tokens, 0), originalPath };
}

function compile(path, options = {}) {
  const config = settings(options, 'compile');
  const { tokens } = dataFor(path, config.encodePath);
  const encode = config.encode === false ? identity : config.encode === encodeURIComponent ? encodeComponent : config.encode;
  function render(tokens, data, missing) {
    let result = '';
    for (const token of tokens) {
      if (token.type === 'text') { result += token.value; continue; }
      if (token.type === 'group') {
        const before = missing.length;
        const value = render(token.tokens, data, missing);
        if (missing.length === before) result += value;
        else missing.length = before;
        continue;
      }
      const name = token.name;
      const value = Object.hasOwn(data, name) ? data[name] : undefined;
      if (value == null) { missing.push(name); continue; }
      if (token.type === 'wildcard' && config.encode !== false) {
        if (!Array.isArray(value)) throw new TypeError('Expected "' + name + '" to be a non-empty array');
        const length = value.length;
        if (!Number.isInteger(length) || length <= 0 || length > 0xffffffff) throw new TypeError('Expected "' + name + '" to be a non-empty array');
        for (let i = 0; i < length; i++) {
          const part = Object.hasOwn(value, i) ? value[i] : undefined;
          if (typeof part !== 'string') throw new TypeError('Expected "' + name + '/' + i + '" to be a string');
          if (i) result += config.delimiter;
          result += string(encode(part), 'encode result');
        }
      } else {
        if (typeof value !== 'string') throw new TypeError('Expected "' + name + '" to be a string');
        result += string(encode(value), 'encode result');
      }
    }
    return result;
  }
  // Constant templates do not need a per-token closure or missing-value array.
  if (tokens.every(token => token.type === 'text')) {
    const value = tokens.map(token => token.value).join('');
    return function toPath(data = {}) { object(data, 'parameters'); return value; };
  }
  return function toPath(data = {}) {
    object(data, 'parameters');
    const missing = [];
    const result = render(tokens, data, missing);
    if (missing.length) throw new TypeError('Missing parameters: ' + missing.join(', '));
    return result;
  };
}

function build(path, config) {
  const keys = [], sources = [], active = new Set();
  let total = 0;
  function alternatives(tokens) {
    let count = 1;
    for (const token of tokens) if (token.type === 'group') {
      count *= alternatives(token.tokens) + 1;
      if (count > 256) return 257;
    }
    return count;
  }
  function process(path, depth) {
    if (depth > MAX_DEPTH) throw new PathError('Too much nesting (maximum 128)', undefined);
    if (Array.isArray(path)) {
      if (active.has(path)) throw new PathError('Cyclic path array', undefined);
      active.add(path);
      const length = path.length;
      if (!Number.isInteger(length) || length < 0 || length > 0xffffffff) throw new TypeError('invalid path array length');
      for (let i = 0; i < length; i++) {
        if (!Object.hasOwn(path, i)) throw new TypeError('paths must have own entries');
        process(path[i], depth + 1);
      }
      active.delete(path); return;
    }
    const data = dataFor(path, config.encodePath);
    total += alternatives(data.tokens);
    if (total > 256) throw new PathError('Too many path combinations', data.originalPath);
    sources.push(lower(data.tokens, config.delimiter, keys, data.originalPath, PathError));
  }
  process(path, 0);
  const delimiter = escapeRegex(config.delimiter);
  let pattern = '^(?:' + sources.join('|') + ')';
  if (config.trailing) pattern += '(?:' + delimiter + '$)?';
  pattern += config.end ? '$' : '(?=' + delimiter + '|$)';
  return { regexp: new RegExp(pattern, config.sensitive ? '' : 'i'), keys };
}
function pathToRegexp(path, options = {}) { return build(path, settings(options, 'regexp')); }
function match(path, options = {}) {
  const config = settings(options, 'match');
  const { regexp, keys } = build(path, config);
  const names = keys.map(key => key.name);
  const repeated = keys.map(key => key.type === 'wildcard' && config.decode !== false);
  const customDecode = config.decode;
  const decode = config.decode === false ? identity : config.decode === decodeURIComponent
    ? value => value.includes('%') ? decodeURIComponent(value) : value
    : value => string(customDecode(value), 'decode result');
  if (keys.length === 0 && config.end) return function match(input) {
    string(input, 'input');
    return regexp.test(input) ? { path: input, params: Object.create(null) } : false;
  };
  return function match(input) {
    string(input, 'input');
    const found = regexp.exec(input);
    if (!found) return false;
    const params = Object.create(null);
    for (let i = 1; i < found.length; i++) {
      const value = found[i];
      if (value === undefined) continue;
      if (repeated[i - 1]) {
        const parts = value.split(config.delimiter);
        if (customDecode === decodeURIComponent) {
          for (let j = 0; j < parts.length; j++) parts[j] = decode(parts[j]);
          params[names[i - 1]] = parts;
        } else {
          // Custom codecs retain Array.map's index and original-array arguments.
          const values = parts.map(customDecode);
          for (const part of values) string(part, 'decode result');
          params[names[i - 1]] = values;
        }
      } else params[names[i - 1]] = decode(value);
    }
    return { path: found[0], params };
  };
}
function stringifyName(name, nextText = '') {
  const first = nextText ? String.fromCodePoint(nextText.codePointAt(0)) : '';
  if (ID.test(name) && (!first || !ID_CONTINUE.test(first))) return name;
  // The grammar escapes literal characters, not JSON's escape codes.
  return '"' + name.replace(/["\\]/g, '\\$&') + '"';
}
function stringifyTokens(tokens, depth, ancestors, originalPath) {
  if (!Array.isArray(tokens)) throw new TypeError('tokens must be an array');
  if (depth > MAX_DEPTH) throw new PathError('Too much nesting (maximum 128)', originalPath);
  for (let parent = ancestors; parent; parent = parent.parent) {
    if (parent.tokens === tokens) throw new PathError('Cyclic token data', originalPath);
  }
  const length = tokens.length;
  if (!Number.isInteger(length) || length < 0 || length > 0xffffffff) throw new TypeError('invalid tokens length');
  let result = '', pending = '', prefix = '';
  for (let i = 0; i < length; i++) {
    if (!Object.hasOwn(tokens, i)) throw new TypeError('tokens must have own entries');
    const token = tokens[i]; object(token, 'token');
    const type = token.type;
    if (type === 'text') {
      const value = string(token.value, 'text value');
      if (!value) continue;
      if (pending) { result += prefix + stringifyName(pending, value); pending = ''; }
      result += value.replace(/[{}()\[\]+?!:*\\]/g, '\\$&');
    } else {
      if (pending) { result += prefix + stringifyName(pending); pending = ''; }
      if (type === 'group') result += '{' + stringifyTokens(token.tokens, depth + 1, { tokens, parent: ancestors }, originalPath) + '}';
      else if (type === 'param' || type === 'wildcard') {
        pending = string(token.name, 'parameter name');
        if (!pending) throw new TypeError('parameter name must not be empty');
        prefix = type === 'param' ? ':' : '*';
      } else throw new TypeError('Unknown token type: ' + String(type));
    }
  }
  if (pending) result += prefix + stringifyName(pending);
  return result;
}
function stringify(data) {
  object(data, 'data');
  const originalPath = data.originalPath;
  if (originalPath !== undefined) string(originalPath, 'originalPath');
  return stringifyTokens(data.tokens, 0, null, originalPath);
}
