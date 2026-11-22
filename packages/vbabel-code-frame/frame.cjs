"use strict";
const colors = require("vpicocolors");
const { default: tokens, matchToToken } = require("vjs-tokens");
const {
  isKeyword,
  isStrictReservedWord,
} = require("vbabel-helper-validator-identifier");
const newline = /\r\n|[\n\r\u2028\u2029]/;
const contextual = new Set(["as", "async", "from", "get", "of", "set"]);
const ansi = colors.createColors(true);
function paint(kind, text) {
  switch (kind) {
    case "keyword":
      return ansi.cyan(text);
    case "capitalized":
    case "jsx":
    case "punctuator":
      return ansi.yellow(text);
    case "number":
    case "regex":
      return ansi.magenta(text);
    case "string":
      return ansi.green(text);
    case "comment":
      return ansi.gray(text);
    case "invalid":
      return ansi.white(ansi.bgRed(ansi.bold(text)));
    default:
      return text;
  }
}
function highlight(source) {
  if (!source) return "";
  // Each call owns its cursor, including after an exception or nested call.
  const scanner = new RegExp(tokens);
  let match,
    result = "";
  while ((match = scanner.exec(source))) {
    const token = matchToToken(match);
    let kind = token.type;
    if (kind === "name") {
      const name = token.value;
      if (
        isKeyword(name) ||
        isStrictReservedWord(name, true) ||
        contextual.has(name)
      )
        kind = "keyword";
      else if (
        /^[a-z][\w-]*$/i.test(name) &&
        (source[match.index - 1] === "<" ||
          source.slice(match.index - 2, match.index) === "</")
      )
        kind = "jsx";
      else {
        const first = String.fromCodePoint(name.codePointAt(0));
        if (first !== first.toLowerCase()) kind = "capitalized";
      }
    } else if (kind === "punctuator" && /^[()[\]{}]$/.test(token.value))
      kind = "bracket";
    else if (kind === "invalid" && (token.value === "@" || token.value === "#"))
      kind = "punctuator";
    const colored = [
      "keyword",
      "capitalized",
      "jsx",
      "punctuator",
      "number",
      "regex",
      "string",
      "comment",
      "invalid",
    ].includes(kind);
    result += colored
      ? token.value
          .split(newline)
          .map((part) => paint(kind, part))
          .join("\n")
      : token.value;
  }
  return result;
}
function codeFrameColumns(source, location, options = {}) {
  const lines = source.split(newline);
  const base = (options.startLine || 1) - 1;
  const start = { line: -1, column: 0, ...location.start };
  const end = { ...start, ...location.end };
  const first = start.line - base,
    last = end.line - base;
  const from =
    first === -1 ? 0 : Math.max(0, first - (options.linesAbove ?? 2) - 1);
  const to =
    last === -1
      ? lines.length
      : Math.min(lines.length, last + (options.linesBelow ?? 3));
  const width = String(to + base).length;
  const enabled =
    options.forceColor ||
    (options.highlightCode &&
      colors.isColorSupported &&
      !(
        typeof process === "object" &&
        ["0", "false"].includes(process.env.FORCE_COLOR)
      ));
  const output = enabled ? highlight(source).split(newline) : lines;
  const red = (text) => (enabled ? ansi.red(ansi.bold(text)) : text);
  const gutter = (text) => (enabled ? ansi.gray(text) : text);
  const rows = [];
  for (let index = from; index < to; index++) {
    const line = index + 1,
      marked = line >= first && line <= last;
    const prefix = " " + (" " + (line + base)).slice(-width) + " |";
    rows.push(
      (marked ? red(">") : " ") +
        gutter(prefix) +
        (output[index] ? " " + output[index] : ""),
    );
    if (
      !marked ||
      (!start.column && !(first === last && end.column !== start.column))
    )
      continue;
    const column = line === first ? start.column : 0;
    const length =
      first === last
        ? end.column - start.column
        : line === first
          ? lines[index].length - start.column + 1
          : line === last
            ? end.column
            : lines[index].length;
    const spacing = lines[index]
      .slice(0, Math.max(0, column - 1))
      .replace(/[^\t]/g, " ");
    rows.push(
      " " +
        gutter(prefix.replace(/\d/g, " ")) +
        " " +
        spacing +
        red("^").repeat(Math.max(1, length)) +
        (line === last && options.message ? " " + red(options.message) : ""),
    );
  }
  let result = rows.join("\n");
  if (options.message && typeof location.start?.column !== "number")
    result = " ".repeat(width + 1) + options.message + "\n" + result;
  return enabled ? ansi.reset(result) : result;
}
let warned = false;
function legacy(source, line, column, options) {
  if (!warned) {
    warned = true;
    const message =
      "Passing lineNumber and colNumber is deprecated to @babel/code-frame. Please use `codeFrameColumns`.";
    if (typeof process === "object" && process.emitWarning)
      process.emitWarning(message, "DeprecationWarning");
    else console.warn(new Error(message));
  }
  return codeFrameColumns(
    source,
    { start: { line, column: Math.max(0, column) } },
    options,
  );
}
module.exports = { legacy, codeFrameColumns, highlight };
