"use strict";
module.exports = function parse(text, matches) {
  if (typeof text !== "string" || !Array.isArray(matches))
    throw new TypeError("Expected a string and an array of match ranges");
  const parts = [];
  let cursor = 0;
  for (const range of matches) {
    if (!Array.isArray(range) || range.length !== 2)
      throw new RangeError("Each match must be a [start, end] pair");
    const [start, end] = range;
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < cursor ||
      end <= start ||
      end > text.length
    )
      throw new RangeError(
        "Matches must be ordered, nonoverlapping, nonempty UTF-16 ranges within text",
      );
    if (start > cursor)
      parts.push({ text: text.slice(cursor, start), highlight: false });
    parts.push({ text: text.slice(start, end), highlight: true });
    cursor = end;
  }
  if (cursor < text.length || !parts.length)
    parts.push({ text: text.slice(cursor), highlight: false });
  return parts;
};
