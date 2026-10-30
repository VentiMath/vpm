'use strict';

// XML 1.0 Fifth Edition and XML 1.1 Second Edition use the same name grammar.
const start = 'A-Z_a-z\\u00c0-\\u00d6\\u00d8-\\u00f6\\u00f8-\\u02ff\\u0370-\\u037d\\u037f-\\u1fff\\u200c-\\u200d\\u2070-\\u218f\\u2c00-\\u2fef\\u3001-\\ud7ff\\uf900-\\ufdcf\\ufdf0-\\ufffd\\u{10000}-\\u{effff}';
const extra = '\\-.0-9\\u00b7\\u0300-\\u036f\\u203f-\\u2040';
const productions = ['name', 'ncName', 'qName', 'nmToken', 'nmTokens'];
function grammar(ascii) {
  const s = ascii ? 'A-Z_a-z' : start, c = s + (ascii ? '\\-.0-9' : extra);
  const nc = `[${s}][${c}]*`, token = `[${c}:]+`;
  const patterns = [`[${s}:][${c}:]*`, nc, `${nc}(?::${nc})?`, token, `${token}(?: ${token})*`];
  return {
    patterns: patterns.map(p => new RegExp(`^(?:${p})(?![\\s\\S])`, 'u')),
    start: new RegExp(`^[${s}]$`, 'u'), char: new RegExp(`^[${c}]$`, 'u'),
    invalid: new RegExp(`[^${c}]`, 'gu'), invalidWithColon: new RegExp(`[^${c}:]`, 'gu'),
  };
}
const unicode = grammar(false), ascii = grammar(true);
function options(opts) {
  if (opts === undefined) return unicode;
  if (opts === null || typeof opts !== 'object') throw new TypeError('Options must be an object');
  // Upstream treats any value other than '1.1' as '1.0'. Preserve that
  // tolerance: fast-xml-parser passes numeric and nested version values.
  // Both supported editions have identical name productions anyway.
  if (opts.asciiOnly !== undefined && typeof opts.asciiOnly !== 'boolean') throw new TypeError('asciiOnly must be a boolean');
  return opts.asciiOnly ? ascii : unicode;
}
function productionIndex(production) {
  const index = productions.indexOf(production);
  if (index < 0) throw new TypeError('Unknown XML production');
  return index;
}
function string(value) {
  if (typeof value !== 'string') throw new TypeError('Input must be a string');
}
function test(value, index, opts) { string(value); return options(opts).patterns[index].test(value); }
exports.name = (value, opts) => test(value, 0, opts);
exports.ncName = (value, opts) => test(value, 1, opts);
exports.qName = (value, opts) => test(value, 2, opts);
exports.nmToken = (value, opts) => test(value, 3, opts);
exports.nmTokens = (value, opts) => test(value, 4, opts);
exports.createValidator = function createValidator(production, opts) {
  const pattern = options(opts).patterns[productionIndex(production)];
  const limit = opts?.maxCacheSize === undefined ? 2048 : opts.maxCacheSize;
  if (!Number.isSafeInteger(limit) || limit < 0) throw new RangeError('maxCacheSize must be a nonnegative safe integer');
  const cache = new Map();
  function validator(value) {
    string(value);
    const saved = cache.get(value);
    if (saved !== undefined) return saved;
    const result = pattern.test(value);
    if (cache.size < limit) cache.set(value, result);
    return result;
  }
  validator.reset = () => cache.clear();
  return validator;
};
function detail(value, production, index, g) {
  const result = {valid: g.patterns[index].test(value), production, input: value};
  if (result.valid) return result;
  const fail = (reason, position) => { result.reason = reason; result.position = position; return result; };
  if (!value.length) return fail('Input must not be empty', 0);
  let atStart = index < 3, colon = false, previousSpace = true;
  for (let i = 0; i < value.length;) {
    const cp = value.codePointAt(i), ch = String.fromCodePoint(cp);
    if (ch === ':') {
      if (index === 1) return fail('NCName cannot contain a colon', i);
      if (index === 2) {
        if (i === 0) return fail('QName cannot start with a colon', i);
        if (colon) return fail('QName permits at most one colon', i);
        if (i === value.length - 1) return fail('QName cannot end with a colon', i);
        colon = true; atStart = true; i++; continue;
      }
    } else if (index === 4 && ch === ' ') {
      if (previousSpace || i === value.length - 1) return fail('Nmtokens requires single spaces between tokens', i);
      previousSpace = true; i++; continue;
    } else if (!(atStart ? g.start : g.char).test(ch)) {
      return fail(atStart ? 'Invalid NameStartChar' : 'Invalid NameChar', i);
    }
    atStart = false; previousSpace = false; i += ch.length;
  }
  throw new Error('XML diagnostic grammar disagrees with validation');
}
exports.validate = function validate(value, production, opts) {
  string(value); return detail(value, production, productionIndex(production), options(opts));
};
exports.validateAll = function validateAll(values, production, opts) {
  const index = productionIndex(production), g = options(opts);
  if (!Array.isArray(values)) throw new TypeError('Inputs must be an array');
  return values.map(value => { string(value); return detail(value, production, index, g); });
};
exports.sanitize = function sanitize(value, production = 'name', opts) {
  string(value);
  const index = productionIndex(production), g = options(opts);
  const replacement = opts?.replacement === undefined ? '_' : opts.replacement;
  string(replacement);
  // A replacement may contain continuation characters (e.g. '-') but never
  // separators. Use '_' to repair a start when that replacement cannot.
  if (replacement !== '_' && (!replacement || [...replacement].some(ch => !g.char.test(ch)))) throw new TypeError('replacement must contain non-colon NameChar characters');
  if (index !== 0 && g.patterns[index].test(value)) return value;
  const prefix = replacement === '_' || g.start.test(String.fromCodePoint(replacement.codePointAt(0))) ? replacement : '_';
  function part(text, needsStart, allowColon) {
    if (index === 1) text = text.replace(/:/g, '');
    let output = text.replace(allowColon ? g.invalidWithColon : g.invalid, replacement);
    if (!output) output = prefix;
    if (needsStart && !(allowColon && output[0] === ':') && !g.start.test(String.fromCodePoint(output.codePointAt(0)))) output = prefix + output;
    return output;
  }
  if (index === 2) {
    const colon = value.indexOf(':');
    return colon < 0 ? part(value, true, false) : part(value.slice(0, colon), true, false) + ':' + part(value.slice(colon + 1), true, false);
  }
  if (index === 4) return value.trim().split(/[ \t\r\n]+/).map(v => part(v, false, true)).join(' ');
  return part(value, index < 3, index !== 1);
};
