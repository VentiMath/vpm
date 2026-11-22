"use strict";

// Decode ASCII digits without accepting whitespace, signs, or a prefix.
function digitAt(input, index) {
  const c = input.charCodeAt(index);
  if (c >= 48 && c <= 57) return c - 48;
  const lower = c | 32;
  return lower >= 97 && lower <= 102 ? lower - 87 : Infinity;
}
function readInt(
  input,
  pos,
  lineStart,
  curLine,
  radix,
  len,
  forceLen,
  allowNumSeparator,
  errors,
  bailOnError,
) {
  const start = pos;
  const limit = len == null ? input.length : start + len;
  let value = 0,
    malformed = false;
  while (pos < limit) {
    const c = input[pos];
    if (c === "_" && allowNumSeparator !== "bail") {
      const forbidden = radix === 16 ? ".Xx_" : ".BbEeOo_+-";
      if (
        !allowNumSeparator ||
        digitAt(input, pos + 1) >= radix ||
        (pos > 0 && forbidden.includes(input[pos - 1]))
      ) {
        if (bailOnError) return { n: null, pos };
        const reason = allowNumSeparator
          ? "unexpectedNumericSeparator"
          : "numericSeparatorInEscapeSequence";
        errors[reason](pos, lineStart, curLine);
      }
    } else {
      let digit = digitAt(input, pos);
      if (digit >= radix) {
        if (digit < 10) {
          if (bailOnError) return { n: null, pos };
          errors.invalidDigit(pos, lineStart, curLine, radix);
        } else if (forceLen) {
          malformed = true;
        } else break;
        digit = 0;
      }
      value = value * radix + digit;
    }
    pos++;
  }
  return {
    n:
      pos === start || malformed || (len != null && pos !== limit)
        ? null
        : value,
    pos,
  };
}

function hex(input, start, lineStart, curLine, width, braced, report, errors) {
  const result = readInt(
    input,
    start,
    lineStart,
    curLine,
    16,
    width,
    braced,
    false,
    errors,
    !report,
  );
  if (result.n !== null) return { code: result.n, pos: result.pos };
  if (report) errors.invalidEscapeSequence(start, lineStart, curLine);
  return { code: null, pos: report ? result.pos : start - 1 };
}
function readCodePoint(input, pos, lineStart, curLine, report, errors) {
  if (input[pos] !== "{")
    return hex(input, pos, lineStart, curLine, 4, false, report, errors);
  const start = pos + 1,
    end = input.indexOf("}", start);
  if (end < 0) {
    if (report) errors.invalidEscapeSequence(start, lineStart, curLine);
    return { code: null, pos: start };
  }
  const result = hex(
    input,
    start,
    lineStart,
    curLine,
    end - start,
    true,
    report,
    errors,
  );
  result.pos++;
  if (result.code > 0x10ffff) {
    if (report) errors.invalidCodePoint(result.pos, lineStart, curLine);
    result.code = null;
  }
  return result;
}

const simple = Object.assign(Object.create(null), {
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
  v: "\v",
});
// Every marker consumes one UTF-16 unit. The dollar only matches before a brace.
const templateMarker = /[\\\x60\r\n\u2028\u2029]|\$(?=\{)/g;
const singleMarker = /[\\'\r\n\u2028\u2029]/g;
const doubleMarker = /[\\"\r\n\u2028\u2029]/g;
function scanContents(
  type,
  input,
  start,
  initialLineStart,
  initialLine,
  errors,
) {
  const template = type === "template";
  const markers = template
    ? templateMarker
    : type === "double"
      ? doubleMarker
      : singleMarker;
  let pos = start,
    lineStart = initialLineStart,
    curLine = initialLine,
    chunk = start,
    str = "",
    firstInvalidLoc = null;
  for (;;) {
    // Restore our cursor after any diagnostic that re-entered this helper.
    markers.lastIndex = pos;
    if (!markers.test(input)) {
      pos = Math.max(pos, input.length);
      errors.unterminated(start, initialLineStart, initialLine);
      break;
    }
    pos = markers.lastIndex - 1;
    const c = input[pos];
    if (c === "\r" || c === "\n") {
      if (!template) {
        errors.unterminated(start, initialLineStart, initialLine);
        break;
      }
      str += input.slice(chunk, pos) + "\n";
      pos += c === "\r" && input[pos + 1] === "\n" ? 2 : 1;
      curLine++;
      lineStart = chunk = pos;
      continue;
    }
    if (c === "\u2028" || c === "\u2029") {
      lineStart = ++pos;
      curLine++;
      continue;
    }
    if (c !== "\\") break;
    const slash = pos,
      index = pos + 1,
      esc = input[index];
    str += input.slice(chunk, slash);
    pos = index + 1;
    let decoded;
    if (esc === "x" || esc === "u") {
      const res =
        esc === "x"
          ? hex(input, pos, lineStart, curLine, 2, false, !template, errors)
          : readCodePoint(input, pos, lineStart, curLine, !template, errors);
      pos = res.pos;
      decoded = res.code === null ? null : String.fromCodePoint(res.code);
    } else if (esc === "\n" || esc === "\r") {
      if (esc === "\r" && input[pos] === "\n") pos++;
      curLine++;
      lineStart = pos;
      decoded = "";
    } else if (esc === "\u2028" || esc === "\u2029") {
      decoded = "";
    } else if (esc >= "0" && esc <= "9") {
      let octal = esc.charCodeAt(0) - 48;
      if (octal <= 7) {
        while (
          pos - index < 3 &&
          digitAt(input, pos) < 8 &&
          octal * 8 + digitAt(input, pos) <= 255
        ) {
          octal = octal * 8 + digitAt(input, pos++);
        }
        decoded = String.fromCharCode(octal);
      } else decoded = esc;
      if (
        esc !== "0" ||
        pos !== index + 1 ||
        input[pos] === "8" ||
        input[pos] === "9"
      ) {
        if (template) decoded = null;
        else errors.strictNumericEscape(index, lineStart, curLine);
      }
    } else decoded = simple[esc] ?? esc ?? "\0";
    if (decoded === null && !firstInvalidLoc)
      firstInvalidLoc = { pos: slash, lineStart, curLine };
    else str += decoded;
    chunk = pos;
  }
  return {
    pos,
    str: str + input.slice(chunk, pos),
    firstInvalidLoc,
    lineStart,
    curLine,
    containsInvalid: firstInvalidLoc !== null,
  };
}
// Short complete elements are common in Babel's AST builders. Avoid setting
// up the general escape scanner unless the input contains template syntax.
function readStringContents(type, input, pos, lineStart, curLine, errors) {
  if (type === "template" && pos === 0 && input.length <= 24) {
    for (let index = 0; index < input.length; index++) {
      const code = input.charCodeAt(index);
      if (
        code === 92 ||
        code === 96 ||
        code === 13 ||
        code === 10 ||
        code === 0x2028 ||
        code === 0x2029 ||
        (code === 36 && input.charCodeAt(index + 1) === 123)
      ) {
        return scanContents(type, input, pos, lineStart, curLine, errors);
      }
    }
    errors.unterminated(0, lineStart, curLine);
    return {
      pos: input.length,
      str: input,
      firstInvalidLoc: null,
      lineStart,
      curLine,
      containsInvalid: false,
    };
  }
  return scanContents(type, input, pos, lineStart, curLine, errors);
}
module.exports = { readCodePoint, readInt, readStringContents };
