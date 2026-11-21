"use strict";
const alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const digits = new Int8Array(128).fill(-1);
for (let i = 0; i < alphabet.length; i++) digits[alphabet.charCodeAt(i)] = i;

const ascii = Uint8Array.from(alphabet, (character) => character.charCodeAt(0));
const decoder = new TextDecoder();
function encode(lines) {
  if (!Array.isArray(lines)) throw new TypeError("Expected mapping lines");
  // Keep the common short map cheap and bound temporary storage for large maps.
  const bytes = new Uint8Array(lines.length < 8 ? 128 : 8192);
  let used = 0,
    text = "";
  const previous = [0, 0, 0, 0, 0];
  function reserve(count) {
    if (used + count > bytes.length) {
      text += decoder.decode(bytes.subarray(0, used));
      used = 0;
    }
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!Array.isArray(line)) throw new TypeError("Expected a mapping line");
    if (i) {
      reserve(1);
      bytes[used++] = 59;
    }
    previous[0] = 0;
    for (let j = 0; j < line.length; j++) {
      const segment = line[j],
        fields = segment?.length;
      if (
        !Array.isArray(segment) ||
        !(fields === 1 || fields === 4 || fields === 5)
      )
        throw new TypeError("Expected a 1-, 4- or 5-field segment");
      reserve(1 + 7 * fields);
      if (j) bytes[used++] = 44;
      for (let k = 0; k < fields; k++) {
        const value = segment[k];
        if (!Number.isSafeInteger(value))
          throw new TypeError("Expected an integer mapping field");
        const delta = value - previous[k];
        if ((delta | 0) !== delta)
          throw new RangeError("Expected a signed 32-bit mapping delta");
        previous[k] = value;
        let bits = ((Math.abs(delta) << 1) | Number(delta < 0)) >>> 0;
        while (bits >= 32) {
          bytes[used++] = ascii[32 + (bits & 31)];
          bits >>>= 5;
        }
        bytes[used++] = ascii[bits];
      }
    }
  }
  return text + (used ? decoder.decode(bytes.subarray(0, used)) : "");
}
function decode(text) {
  if (typeof text !== "string")
    throw new TypeError("Expected an encoded mappings string");
  let at = 0,
    source = 0,
    originalLine = 0,
    originalColumn = 0,
    name = 0;
  function delta() {
    let digit = digits[text.charCodeAt(at++)];
    if (!(digit >= 0))
      throw new SyntaxError("Invalid or missing mapping digit");
    let bits = digit & 31;
    for (let shift = 5; digit >= 32; shift += 5) {
      digit = digits[text.charCodeAt(at++)];
      if (!(digit >= 0)) throw new SyntaxError("Unterminated mapping delta");
      if (shift === 30 && digit > 3)
        throw new RangeError("Mapping delta overflow");
      bits |= (digit & 31) << shift;
    }
    return bits & 1 ? -(bits >>> 1) || -2147483648 : bits >>> 1;
  }
  const hasField = () =>
    at < text.length &&
    text.charCodeAt(at) !== 44 &&
    text.charCodeAt(at) !== 59;
  const result = [];
  do {
    const line = [];
    let column = 0,
      unordered = false;
    if (at < text.length && text.charCodeAt(at) !== 59) {
      for (;;) {
        const step = delta();
        if (step < 0 && line.length) unordered = true;
        column += step;
        if (hasField()) {
          source += delta();
          originalLine += delta();
          originalColumn += delta();
          if (hasField())
            line.push([
              column,
              source,
              originalLine,
              originalColumn,
              (name += delta()),
            ]);
          else line.push([column, source, originalLine, originalColumn]);
        } else line.push([column]);
        if (at === text.length || text.charCodeAt(at) === 59) break;
        if (text.charCodeAt(at++) !== 44)
          throw new SyntaxError("Too many mapping fields");
      }
    }
    if (unordered) line.sort((a, b) => a[0] - b[0]);
    result.push(line);
    if (at === text.length) break;
    at++;
  } while (true);
  return result;
}
module.exports = { decode, encode };
