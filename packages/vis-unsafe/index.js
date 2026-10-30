'use strict';

// These are heuristic patterns, not an escaping or sanitization boundary.
// Keep the shipped rules private: RegExp.compile can mutate even a frozen
// RegExp's internal source. Public pattern access returns an isolated copy.
const builtins = new WeakMap();
function expose(rules, label) {
  const list = rules.map(rule => Object.freeze({
    id: rule.id, description: rule.description,
    get pattern() { return new RegExp(rule.pattern.source, rule.pattern.flags); },
  }));
  Object.defineProperty(list, 'label', {value: label, enumerable: true});
  // The parser uses HTML and XML. Group their alternatives by exact flags,
  // scanning the input once per group for the boolean API. Diagnostic APIs
  // retain individual rules and their order. Backreferences cannot be joined.
  let scans;
  if (label === 'HTML' || label === 'XML') {
    const groups = new Map();
    for (const {pattern} of rules) {
      if (/\\[1-9]|\\k</.test(pattern.source) || /[gy]/.test(pattern.flags)) throw new Error('Cannot combine stateful patterns or backreferences');
      const sources = groups.get(pattern.flags) || [];
      sources.push('(?:' + pattern.source + ')'); groups.set(pattern.flags, sources);
    }
    scans = [...groups].map(([flags, sources]) => new RegExp(sources.join('|'), flags));
  }
  builtins.set(list, {rules, scans});
  return Object.freeze(list);
}
const registry = {};
for (const label of ['HTML', 'XML', 'SVG', 'SQL', 'SQL-STRICT', 'SHELL', 'REDOS', 'NOSQL', 'LOG']) {
  const list = expose(require('./contexts/' + label.toLowerCase() + '.js'), label);
  registry[label] = list;
  exports[label.replace('-', '_')] = list;
}
exports.VALID_CONTEXTS = Object.freeze(registry);

const regexTest = RegExp.prototype.test;
function test(pattern, value) {
  if (!pattern.global && !pattern.sticky) return regexTest.call(pattern, value);
  // Clone stateful caller patterns. This also accepts a frozen RegExp and
  // leaves lastIndex untouched on success, failure and exception.
  return regexTest.call(new RegExp(pattern.source, pattern.flags), value);
}
function validateList(list) {
  if (!Array.isArray(list) || !list.length) throw new TypeError('Each context must be a non-empty PatternList');
  if (builtins.has(list)) return;
  if (list.label !== undefined && typeof list.label !== 'string') throw new TypeError('Context label must be a string');
  for (const rule of list) {
    if (!rule || typeof rule.id !== 'string' || typeof rule.description !== 'string' || !(rule.pattern instanceof RegExp)) throw new TypeError('Each rule needs id, description and a RegExp pattern');
  }
}
function validate(value, context) {
  if (typeof value !== 'string') throw new TypeError('Input must be a string');
  if (context instanceof RegExp) return 0;
  if (!Array.isArray(context) || !context.length) throw new TypeError('Context must be a PatternList, array of PatternLists or RegExp');
  if (Array.isArray(context[0])) { for (const list of context) validateList(list); return 2; }
  validateList(context); return 1;
}
function result(rule, label, builtin) {
  return {context: label, id: rule.id, description: rule.description,
    pattern: builtin ? new RegExp(rule.pattern.source, rule.pattern.flags) : rule.pattern};
}
function match(value, list, mode, results) {
  const builtin = builtins.get(list), rules = builtin ? builtin.rules : list;
  if (mode === 0 && builtin?.scans) {
    for (const pattern of builtin.scans) if (pattern.test(value)) return true;
    return false;
  }
  for (const rule of rules) {
    if (builtin ? rule.pattern.test(value) : test(rule.pattern, value)) {
      if (mode === 0) return true;
      const found = result(rule, list.label ?? 'CUSTOM', !!builtin);
      if (mode === 1) return found;
      results.push(found);
    }
  }
  return mode === 0 ? false : null;
}
function check(value, context, mode) {
  const kind = validate(value, context), results = mode === 2 ? [] : undefined;
  if (kind === 0) {
    const found = test(context, value);
    if (mode === 0) return found;
    const item = found ? {context: 'CUSTOM', id: 'custom-regex', description: 'Matched caller-supplied pattern', pattern: context} : null;
    return mode === 1 ? item : item ? [item] : [];
  }
  if (kind === 1) { const found = match(value, context, mode, results); return mode === 2 ? results : found; }
  for (const list of context) {
    const found = match(value, list, mode, results);
    if (mode !== 2 && found) return found;
  }
  return mode === 0 ? false : mode === 1 ? null : results;
}
function isUnsafe(value, context) { return check(value, context, 0); }
exports.isUnsafe = isUnsafe;
exports.default = isUnsafe;
exports.whyUnsafe = (value, context) => check(value, context, 1);
exports.allUnsafe = (value, context) => check(value, context, 2);
