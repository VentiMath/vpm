'use strict';
// Argument parsing derived from minimist 1.2.8. See LICENSE and PROVENANCE.json.
const empty = Object.freeze(Object.create(null));
const emptyNames = Object.freeze([]);
const own = (object, key) => Object.hasOwn(object, key) ? object[key] : undefined;
const numeric = /^(?:0x[\da-f]+|[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)$/i;
const shortNumber = /-?\d+(\.\d*)?(e-?\d+)?$/;
const isOption = value => typeof value === 'string' && value.length > 1 && value[0] === '-' &&
  (value[1] !== '-' || (value.length > 2 && value[2] !== '-'));
const booleanText = value => value === 'true' || value === 'false';
const number = value => typeof value === 'number' || numeric.test(value) ? Number(value) : value;
function names(value, label) {
  if (value === undefined) return emptyNames;
  const list = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(list)) throw new TypeError(label + ' must be a name or an array of names');
  const result = new Array(list.length);
  for (let i = 0; i < result.length; i++) {
    const name = list[i];
    if (typeof name !== 'string' || name.length === 0) throw new TypeError(label + ' names must be nonempty strings');
    result[i] = name;
  }
  return result;
}
function dictionary(value, label) {
  if (value === undefined) return empty;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(label + ' must be an object');
  return value;
}
function flag(value, label) {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') throw new TypeError(label + ' must be a boolean');
  return value;
}
function parse(args, options) {
  // Retain minimist's legacy empty-string input; other inputs are argument arrays.
  if (args === '') args = [];
  if (!Array.isArray(args)) throw new TypeError('args must be an array');
  const input = new Array(args.length);
  for (let i = 0; i < input.length; i++) {
    const value = args[i];
    if (typeof value !== 'string' && !(typeof value === 'number' && Number.isFinite(value))) {
      throw new TypeError('arguments must be strings or finite numbers');
    }
    input[i] = value;
  }
  if (options == null) options = {};
  if (typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object');
  const booleanOption = own(options, 'boolean'), stringOption = own(options, 'string');
  const aliasOption = dictionary(own(options, 'alias'), 'alias');
  const defaultOption = dictionary(own(options, 'default'), 'default');
  const stopEarly = flag(own(options, 'stopEarly'), 'stopEarly');
  const separate = flag(own(options, '--'), '--');
  const unknown = own(options, 'unknown');
  if (unknown !== undefined && typeof unknown !== 'function') throw new TypeError('unknown must be a function');
  const allBools = booleanOption === true;
  const bools = names(typeof booleanOption === 'boolean' ? undefined : booleanOption, 'boolean');
  const strings = names(stringOption, 'string');
  const defaults = Object.create(null);
  for (const key of Object.keys(defaultOption)) defaults[key] = defaultOption[key];
  // Union-find makes overlapping aliases one coherent, transitive group.
  const aliasKeys = Object.keys(aliasOption);
  let aliases = empty;
  if (aliasKeys.length) {
    const parents = new Map();
    function root(name) {
      if (!parents.has(name)) { parents.set(name, name); return name; }
      let top = name;
      while (parents.get(top) !== top) top = parents.get(top);
      while (parents.get(name) !== name) { const next = parents.get(name); parents.set(name, top); name = next; }
      return top;
    }
    for (const key of aliasKeys) {
      if (!key) throw new TypeError('alias names must be nonempty strings');
      const values = names(aliasOption[key], 'alias');
      const target = root(key);
      for (const alias of values) { const other = root(alias); if (other !== target) parents.set(other, target); }
    }
    const groups = new Map();
    aliases = Object.create(null);
    for (const key of parents.keys()) {
      const id = root(key);
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(key);
    }
    for (const group of groups.values()) for (const key of group) aliases[key] = group;
  }
  const booleanNames = bools.length ? Object.create(null) : empty;
  const stringNames = strings.length ? Object.create(null) : empty;
  for (const key of bools) for (const name of aliases[key] || [key]) booleanNames[name] = true;
  for (const key of strings) for (const name of aliases[key] || [key]) stringNames[name] = true;
  let paths;
  function path(key) {
    if (paths === undefined) paths = Object.create(null);
    if (Object.hasOwn(paths, key)) return paths[key];
    const parts = key.split('.');
    // Reserve the positional/tail arrays and refuse prototype-navigation keys.
    return paths[key] = parts[0] === '_' || parts[0] === '--' || parts.some(part =>
      part === '__proto__' || part === 'constructor' || part === 'prototype') ? null : parts;
  }
  const argv = { _: [] };
  let owned;
  function remember(object) { if (owned === undefined) owned = new WeakSet(); owned.add(object); }
  function write(object, key, value) {
    if (key in object && !Object.hasOwn(object, key)) {
      Object.defineProperty(object, key, { value, writable: true, configurable: true, enumerable: true });
    } else object[key] = value;
  }
  function set(key, value, replace) {
    let object = argv, leaf = key;
    if (key.indexOf('.') !== -1) {
      const parts = path(key);
      if (parts === null) return;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        let child = own(object, part);
        if (child === undefined) { child = {}; remember(child); write(object, part, child); }
        else if (!owned || !owned.has(child) || Array.isArray(child)) throw new TypeError('conflicting argument paths');
        object = child;
      }
      leaf = parts[parts.length - 1];
    } else if (key === '_' || key === '--' || key === '__proto__' || key === 'constructor' || key === 'prototype') return;
    const previous = own(object, leaf);
    if (replace || previous === undefined || booleanNames[key] || typeof previous === 'boolean') write(object, leaf, value);
    else if (Array.isArray(previous) && owned && owned.has(previous)) previous.push(value);
    else { const values = Array.isArray(previous) ? previous.concat([value]) : [previous, value]; remember(values); write(object, leaf, values); }
  }
  function defined(key, arg) {
    return (allBools && arg.startsWith('--') && arg.indexOf('=') === -1) || stringNames[key] || booleanNames[key] || aliases[key];
  }
  function assign(key, raw, arg) {
    if (arg !== undefined && unknown && !defined(key, arg) && unknown(arg) === false) return;
    const value = stringNames[key] ? raw : (typeof raw === 'string' || typeof raw === 'number' ? number(raw) : raw);
    const group = aliases[key];
    if (group) { for (const name of group) set(name, value, false); }
    else set(key, value, false);
  }
  const initialized = new Set();
  for (const key of bools) {
    const group = aliases[key] || [key];
    if (initialized.has(group[0])) continue;
    initialized.add(group[0]);
    let value = false;
    for (const name of [key, ...group]) if (Object.hasOwn(defaults, name)) { value = defaults[name]; break; }
    if (!stringNames[key] && (typeof value === 'string' || typeof value === 'number')) value = number(value);
    for (const name of group) set(name, value, true);
  }
  const separator = input.indexOf('--'), end = separator < 0 ? input.length : separator;
  for (let i = 0; i < end; i++) {
    const arg = input[i], next = i + 1 < end ? input[i + 1] : undefined;
    if (typeof arg === 'string' && arg.length > 2 && arg.startsWith('--')) {
      const equals = arg.indexOf('=', 3);
      if (equals >= 0) {
        const key = arg.slice(2, equals), raw = arg.slice(equals + 1);
        assign(key, booleanNames[key] ? raw !== 'false' : raw, arg);
      } else if (arg.startsWith('--no-') && arg.length > 5) assign(arg.slice(5), false, arg);
      else {
        const key = arg.slice(2);
        if (next !== undefined && !isOption(next) && !booleanNames[key] && !allBools) { assign(key, next, arg); i++; }
        else if (booleanText(next)) { assign(key, next === 'true', arg); i++; }
        else assign(key, stringNames[key] ? '' : true, arg);
      }
    } else if (typeof arg === 'string' && arg.length > 1 && arg[0] === '-' && arg[1] !== '-') {
      let broken = false;
      for (let j = 1; j < arg.length - 1; j++) {
        const key = arg[j], tail = arg.slice(j + 1), alpha = /[A-Za-z]/.test(key);
        if (tail === '-') { assign(key, tail, arg); continue; }
        if (alpha && tail[0] === '=') { assign(key, tail.slice(1), arg); broken = true; break; }
        if (alpha && shortNumber.test(tail)) { assign(key, tail, arg); broken = true; break; }
        if (/\W/.test(arg[j + 1])) { assign(key, tail, arg); broken = true; break; }
        assign(key, stringNames[key] ? '' : true, arg);
      }
      const key = arg[arg.length - 1];
      if (!broken && key !== '-') {
        if (next && !isOption(next) && !booleanNames[key]) { assign(key, next, arg); i++; }
        else if (next && booleanText(next)) { assign(key, next === 'true', arg); i++; }
        else assign(key, stringNames[key] ? '' : true, arg);
      }
    } else {
      if (!unknown || unknown(arg) !== false) argv._.push(stringNames._ ? arg : number(arg));
      if (stopEarly) { argv._ = argv._.concat(input.slice(i + 1, end)); break; }
    }
  }
  function has(key) {
    if (key.indexOf('.') === -1) return key === '_' || key === '--' || key === '__proto__' || key === 'constructor' || key === 'prototype' || Object.hasOwn(argv, key);
    const parts = path(key);
    if (parts === null) return true;
    let object = argv;
    for (const part of parts) {
      if (object === null || (typeof object !== 'object' && typeof object !== 'function') || !Object.hasOwn(object, part)) return false;
      object = object[part];
    }
    return true;
  }
  for (const key of Object.keys(defaults)) {
    if (!has(key)) for (const name of aliases[key] || [key]) if (!has(name)) set(name, defaults[key], true);
  }
  if (separate) argv['--'] = separator < 0 ? [] : input.slice(separator + 1);
  else if (separator >= 0) for (let i = separator + 1; i < input.length; i++) argv._.push(input[i]);
  return argv;
}
module.exports = Object.freeze(parse);
