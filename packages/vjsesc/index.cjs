"use strict";
const delimiters = { single: "'", double: '"', backtick: "\x60" };
const sensitive = {
  single: /['\\\x00-\x1f\x7f-\u{10ffff}]/gu,
  double: /["\\\x00-\x1f\x7f-\u{10ffff}]/gu,
  backtick: /[\x60\\\x00-\x1f\x7f-\u{10ffff}]|\$(?=\{)/gu,
};
const simple = {
  "\b": "\\b",
  "\t": "\\t",
  "\n": "\\n",
  "\f": "\\f",
  "\r": "\\r",
  "\\": "\\\\",
};
const specialSpace =
  /[\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/u;
function literalNumber(value, options) {
  if (options.json) return JSON.stringify(value);
  if (!Number.isInteger(value)) return String(value);
  const sign = value < 0 ? "-" : "";
  const magnitude = Math.abs(value);
  switch (options.numbers) {
    case "hexadecimal": {
      const hex = magnitude.toString(16);
      return sign + "0x" + (options.lowercaseHex ? hex : hex.toUpperCase());
    }
    case "octal": return sign + "0o" + magnitude.toString(8);
    case "binary": return sign + "0b" + magnitude.toString(2);
    default: return String(value);
  }
}
function jsesc(value, options = {}) {
  if (typeof value === "number") return literalNumber(value, options);
  if (typeof value !== "string")
    throw new TypeError("vjsesc expects a string or number");
  const {
    json = false,
    minimal = false,
    es6 = false,
    escapeEverything = false,
    lowercaseHex = false,
    isScriptContext = false,
    wrap = json,
  } = options;
  const mode = json ? "double" : (options.quotes ?? "single");
  if (!Object.hasOwn(delimiters, mode))
    throw new RangeError("Unknown quote style");
  const quote = delimiters[mode];
  function hex(n, width) {
    const digits = n.toString(16).padStart(width, "0");
    return lowercaseHex ? digits : digits.toUpperCase();
  }
  function escape(char, offset) {
    if (Object.hasOwn(simple, char)) return simple[char];
    if (char === quote || (!json && escapeEverything && /['"\x60]/.test(char)))
      return "\\" + char;
    if (
      mode === "backtick" &&
      char === "$" &&
      value[offset + 1] === "{" &&
      (!escapeEverything || minimal)
    )
      return "\\$";
    const n = char.codePointAt(0);
    if (n === 0 && !json && !/[0-9]/.test(value.charAt(offset + 1)))
      return "\\0";
    if (
      minimal &&
      !(n >= 0xd800 && n <= 0xdfff) &&
      !specialSpace.test(char) &&
      !(json && n < 32)
    )
      return char;
    if (n > 0xffff) {
      if (es6 && !json) return "\\u{" + hex(n, 1) + "}";
      return (
        "\\u" + hex(char.charCodeAt(0), 4) + "\\u" + hex(char.charCodeAt(1), 4)
      );
    }
    return n <= 255 && !json ? "\\x" + hex(n, 2) : "\\u" + hex(n, 4);
  }
  let body = value.replace(
    escapeEverything ? /[\s\S]/gu : sensitive[mode],
    escape,
  );
  if (isScriptContext)
    body = body
      .replace(/<\/(script|style)/gi, "<\\/$1")
      .replace(/<!--/g, json ? "\\u003C!--" : "\\x3C!--");
  return wrap ? quote + body + quote : body;
}
module.exports = jsesc;
