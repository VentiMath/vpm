'use strict';
const anynum = require('vanynum');
const hex = /^[-+]?0x[\da-fA-F]+$/;
const binary = /^0b[01]+$/;
const octal = /^0o[0-7]+$/;
const longDecimal = /^[+-]?(\d*)(?:\.(\d*))?([eE][+-]?\d+)?$/;
const defaults = Object.freeze({hex:true, binary:false, octal:false, leadingZeros:true, eNotation:true, unicode:false, infinity:'original'});
function option(options, key) {
  return Object.hasOwn(options,key) ? options[key] : defaults[key];
}
function infinite(original, value, options) {
  let mode = option(options,'infinity');
  if (typeof mode === 'string' && mode !== 'null' && mode !== 'infinity' && mode !== 'string' && mode !== 'original') mode = mode.toLowerCase();
  switch (mode) {
    case 'null': return null;
    case 'infinity': return value;
    case 'string': return String(value);
    default: return original;
  }
}
function toNumber(original, options = defaults) {
  if (typeof original !== 'string' || original.length === 0) return original;
  if (options === null) options = defaults;
  if (typeof options !== 'object') throw new TypeError('options must be an object');
  let text = original.trim();
  if (text.length === 0) return original;
  const pattern = Object.hasOwn(options,'skipLike') ? options.skipLike : undefined;
  if (pattern !== undefined) {
    if (pattern === null || typeof pattern.test !== 'function') throw new TypeError('skipLike must provide test()');
    let skip;
    if (pattern.global || pattern.sticky) {
      const previous = pattern.lastIndex;
      try { pattern.lastIndex = 0; skip = pattern.test(text); }
      finally { pattern.lastIndex = previous; }
    } else skip = pattern.test(text);
    if (skip) return original;
  }
  if (option(options,'unicode')) text = anynum(text);
  if (text === '0') return 0;
  const first = text.charCodeAt(0), sign = first === 45 || first === 43 ? 1 : 0;
  const negative = first === 45;
  if (text.charCodeAt(sign) === 48 && text.length > sign + 2) {
    const prefix = text.charCodeAt(sign+1);
    let value;
    if (prefix === 120) {
      if (!option(options,'hex') || !hex.test(text)) return original;
      value = parseInt(text,16);
    } else if (prefix === 98 || prefix === 111) {
      if (sign || !option(options,prefix===98?'binary':'octal') || !(prefix===98?binary:octal).test(text)) return original;
      value = parseInt(text.slice(2),prefix===98?2:8);
    }
    if (value !== undefined) return Number.isFinite(value) ? value : infinite(original,value,options);
  }
  if (text === 'Infinity' || text === '+Infinity' || text === '-Infinity') return infinite(original,negative?-Infinity:Infinity,options);

  // One bounded grammar scan. Syntax and option checks precede overflow handling.
  let i = sign, integerEnd, dot = -1, exponent;
  if (text.length > 128 || text.includes('e') || text.includes('E')) {
    // Native regexp scanning avoids repeated JS character reads on long XML values.
    // Digit runs are separated by required punctuation, so they do not overlap.
    const match = longDecimal.exec(text);
    if (!match || (!match[1] && !match[2])) return original;
    integerEnd = sign + match[1].length;
    if (match[2] !== undefined) dot = integerEnd;
    exponent = match[3] !== undefined;
    if (exponent && !option(options,'eNotation')) return original;
  } else {
    while (text.charCodeAt(i) >= 48 && text.charCodeAt(i) <= 57) i++;
    integerEnd = i;
    if (text.charCodeAt(i) === 46) {
      dot = i++;
      while (text.charCodeAt(i) >= 48 && text.charCodeAt(i) <= 57) i++;
    }
    if (i === sign || (integerEnd === sign && i === sign+1 && dot !== -1)) return original;
    exponent = false;
    if (i !== text.length) return original;
  }
  const leading = text.charCodeAt(sign) === 48 && integerEnd - sign > 1;
  if (leading && !option(options,'leadingZeros')) return original;
  let begin = sign;
  while (begin < integerEnd && text.charCodeAt(begin) === 48) begin++;
  // Preserve the upstream explicit all-zero exponent policy (00e2 stays text).
  if (exponent && leading && dot === -1 && begin === integerEnd) return original;
  const value = Number(text);
  if (!Number.isFinite(value)) return infinite(original,value,options);
  if (exponent || value === 0) return value;
  const parsed = String(value);
  if (parsed.includes('e')) return option(options,'eNotation') ? value : original;
  let end = text.length;
  if (dot !== -1) {
    while (end > dot+1 && text.charCodeAt(end-1) === 48) end--;
    if (end === dot+1) end = dot;
  }
  let canonical = text.slice(begin,end);
  if (dot === begin) canonical = '0'+canonical;
  if (negative) canonical = '-'+canonical;
  return parsed === canonical ? value : original;
}
module.exports = toNumber;
