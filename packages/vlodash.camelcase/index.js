'use strict';
// Common RPC names already have their final boundaries and only need their
// initial letter lowercased. Acronyms, numbers and separators take the full path.
const simpleName = /^[A-Za-z][a-z]*(?:[A-Z][a-z]+)*$/;
const nonAscii = /[^\x00-\x7f]/;
const asciiWords = /[A-Z]?[a-z]+|[A-Z]+(?![a-z])|[0-9]+/g;
const apostrophes = /'/g;
let unicode;
function toText(value) {
  if (value == null) return '';
  if (typeof value === 'symbol') return Symbol.prototype.toString.call(value);
  if (typeof value === 'object') {
    // The intrinsic checks the actual Symbol brand, without reading a spoofable
    // Symbol.toStringTag property or invoking the object's conversion hooks.
    try { return Symbol.prototype.toString.call(Symbol.prototype.valueOf.call(value)); } catch {}
  }
  // Preserve the default coercion hint used by lodash.camelcase (valueOf first).
  // Its negative-zero special case does not affect the final camel-case output.
  return value + '';
}
function camelCase(value) {
  const text = typeof value === 'string' ? value : toText(value);
  if (!text) return '';
  if (simpleName.test(text)) {
    const first = text.charCodeAt(0);
    return first >= 65 && first <= 90 ? text[0].toLowerCase() + text.slice(1) : text;
  }
  if (nonAscii.test(text)) return (unicode ||= require('./unicode'))(text);
  const words = (text.includes("'") ? text.replace(apostrophes, '') : text).match(asciiWords);
  if (!words) return '';
  let result = words[0].toLowerCase();
  for (let i = 1; i < words.length; i++) {
    const word = words[i].toLowerCase();
    result += word[0].toUpperCase() + word.slice(1);
  }
  return result;
}
module.exports = camelCase;
