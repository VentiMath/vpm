"use strict";

// Babel 7 consumes a native global RegExp. In particular, exec() must reset
// lastIndex after a failed match, including when highlighting several files.
const escape = /\\(?:\r\n|[\s\S])/.source;
const quoted =
  "([\"'])(?:" +
  escape +
  "|" +
  /(?!\2)[^\\\n\r\u2028\u2029]/.source +
  ")*(\\2)?";
const end = "(?![\\s\\S])";
const tick = "\x60";
const expressionChar =
  /[^{}"']|"(?:\\[\s\S]|[^"\\])*(?:"|(?![\s\S]))|'(?:\\[\s\S]|[^'\\])*(?:'|(?![\s\S]))/
    .source;
const object = "\\{(?:" + expressionChar + ")*(?:\\}|" + end + ")";
const substitution =
  "\\$\\{(?:" + object + "|" + expressionChar + ")*(?:\\}|" + end + ")";
const template =
  tick +
  "(?:" +
  escape +
  "|[^" +
  tick +
  "\\\\$]|\\$(?!\\{)|" +
  substitution +
  ")*(" +
  tick +
  ")?";
const blockComment = /\/\*[\s\S]*?(?:(\*\/)|(?![\s\S]))/.source;
const lineComment = /\/\/[^\n\r\u2028\u2029]*/.source;

const unicodeEscape = /\\u(?:[\da-fA-F]{4}|\{[\da-fA-F]+\})/.source;
const wide = /[^\x00-\x7f\s]/.source;
const nameStart = "(?:[$_a-zA-Z]|" + unicodeEscape + "|" + wide + ")";
const identifier = nameStart + "(?:" + nameStart + "|[0-9])*";
const decimal = /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.source;
const number = "(?:0[xX][\\da-fA-F]+|0[oO][0-7]+|0[bB][01]+|" + decimal + ")";

const rxEscape = /\\[^\n\r\u2028\u2029]/.source;
const classAtom =
  "(?:" + rxEscape + "|" + /[^\\\]\n\r\u2028\u2029]/.source + ")";
const rxClass = "\\[" + classAtom + "*\\]";
const bareBracket = "\\[(?!" + classAtom + "*\\])";
const rxItem =
  "(?:" +
  [rxEscape, rxClass, bareBracket, /[^/\\[\]\n\r\u2028\u2029]/.source].join(
    "|",
  ) +
  ")";
// A slash expression followed by an operand can be division. The v4
// convention treats a flag as a possible divisor before a binary operator.
const flagless =
  "(?!\\s*(?:" + nameStart + "|[\\d\\\\\"'({~]|\\.\\d|[+!\\-](?!=)))";
const flags =
  "[gimsuy]+(?!(?:" +
  nameStart +
  "|[\\d\\\\]))(?!\\s*(?:[+!=?*&|^%<>({\\-]|/(?![/*])))";
const regex = "/(?![*/])" + rxItem + "+/(?:" + flags + "|" + flagless + ")";
const operators = [
  ">>>=",
  "===",
  "!==",
  "...",
  "**=",
  "<<=",
  ">>=",
  ">>>",
  "||",
  "&&",
  "++",
  "--",
  "**",
  "==",
  "!=",
  "=>",
  "<<",
  ">>",
  "<=",
  ">=",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "^=",
  "|=",
  "&=",
];
const punctuator =
  "(?:" +
  operators.map((op) => RegExp.escape(op)).join("|") +
  "|" +
  /[{}()[\].,;:?~+\-*\/%&|^!=<>]/.source +
  ")";
const scanner = new RegExp(
  [
    "(" + quoted + "|" + template + ")",
    "(" + lineComment + ")",
    "(" + blockComment + ")",
    "(" + regex + ")",
    "(" + number + ")",
    "(" + identifier + ")",
    "(" + punctuator + ")",
    "(\\s+)",
    "([\\s\\S]|^$)",
  ].join("|"),
  "g",
);

function matchToToken(match) {
  let type, closed;
  if (match[1] !== undefined) {
    type = "string";
    closed = !!(match[3] || match[4]);
  } else if (match[5] !== undefined || match[6] !== undefined) {
    type = "comment";
    if (match[6] !== undefined) closed = !!match[7];
  } else if (match[8] !== undefined) type = "regex";
  else if (match[9] !== undefined) type = "number";
  else if (match[10] !== undefined) type = "name";
  else if (match[11] !== undefined) type = "punctuator";
  else if (match[12] !== undefined) type = "whitespace";
  else type = "invalid";
  return { type, value: match[0], closed };
}

module.exports = { scanner, matchToToken };
