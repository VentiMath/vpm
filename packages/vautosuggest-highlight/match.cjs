"use strict";
const fold = require("./fold.cjs");
const ascii = /^[\x00-\x7f]*$/;
const wordCharacter = /[a-z0-9_]/i;
const escape = /[.*+?^${}()|[\]\\]/g;

module.exports = function match(text, query, options = {}) {
  if (typeof text !== "string" || typeof query !== "string")
    throw new TypeError("text and query must be strings");
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length || !text.length) return [];
  const source = fold(text);
  let remaining = source.value;
  const matches = [];
  for (const word of words) {
    const needle = fold(word).value;
    const plain = ascii.test(remaining) && ascii.test(needle);
    const pattern = plain
      ? null
      : new RegExp(needle.replace(escape, "\\$&"), "gi");
    const boundary = !options.insideWords && wordCharacter.test(needle[0]);
    let from = 0,
      found = false;
    while (from < remaining.length) {
      if (pattern) pattern.lastIndex = from;
      const hit = plain
        ? remaining.indexOf(needle, from)
        : (pattern.exec(remaining)?.index ?? -1);
      if (hit < 0) break;
      const end = hit + needle.length;
      if (boundary && hit && wordCharacter.test(remaining[hit - 1])) {
        from = hit + 1;
        continue;
      }
      found = true;
      const startOffset = source.offsets ? source.offsets[hit] : hit;
      const endOffset = source.offsets ? source.offsets[end] : end;
      if (endOffset > startOffset) matches.push([startOffset, endOffset]);
      // Consuming a match also opens a word boundary for the next query term,
      // as in match('foobar', 'foo bar'). Keep normalized offsets unchanged.
      remaining =
        remaining.slice(0, hit) +
        " ".repeat(needle.length) +
        remaining.slice(end);
      if (!options.findAllOccurrences) break;
      from = end;
    }
    if (!found && options.requireMatchAll) return [];
  }
  matches.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  // A source ligature can contribute more than one normalized character.
  // Never return overlapping slices when separate terms hit the same glyph.
  let lastEnd = 0;
  return matches.filter((range) => {
    if (range[0] < lastEnd) return false;
    lastEnd = range[1];
    return true;
  });
};
