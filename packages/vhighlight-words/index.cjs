"use strict";
// This cache holds only the last search pattern, never document text or chunks.
let previousQuery, previousExact, previousPattern;
function patternFor(query, exact) {
  if (typeof query !== "string" && !(query instanceof RegExp))
    throw new TypeError("query must be a string or RegExp");
  if (
    typeof query === "string" &&
    query === previousQuery &&
    exact === previousExact
  )
    return previousPattern;
  let source, flags;
  if (query instanceof RegExp) {
    source = query.source;
    flags = query.flags;
  } else {
    const terms = query.trim();
    if (!terms) return null;
    const end = terms.lastIndexOf("/");
    if (terms[0] === "/" && end > 0) {
      source = terms.slice(1, end);
      flags = terms.slice(end + 1);
    } else {
      // Keep tab/newline semantics: upstream separates terms on spaces only.
      const words = exact ? [terms] : terms.split(/ +/);
      source = words
        .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|");
      flags = "i";
    }
  }
  const pattern = new RegExp(source, flags.includes("g") ? flags : flags + "g");
  if (typeof query === "string") {
    previousQuery = query;
    previousExact = exact;
    previousPattern = pattern;
  }
  return pattern;
}
function highlightWords({ text, query, clipBy, matchExactly = false }) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  if (clipBy != null && (!Number.isSafeInteger(clipBy) || clipBy < 0))
    throw new RangeError("clipBy must be a nonnegative safe integer");
  const pattern = patternFor(query, Boolean(matchExactly));
  const chunks = [];
  const add = (start, end, match) =>
    chunks.push({
      key: `${start}:${end}:${match ? 1 : 0}`,
      text: text.slice(start, end),
      match,
    });
  if (!pattern) {
    add(0, text.length, false);
    return chunks;
  }
  pattern.lastIndex = 0;
  let cursor = 0,
    found;
  while ((found = pattern.exec(text)) !== null) {
    const start = found.index,
      length = found[0].length;
    if (!length) {
      // Zero-width assertions cannot highlight a character; advance safely.
      const point = text.codePointAt(pattern.lastIndex);
      pattern.lastIndex +=
        (pattern.unicode || pattern.unicodeSets) && point > 0xffff ? 2 : 1;
      continue;
    }
    if (start > cursor) add(cursor, start, false);
    add(start, start + length, true);
    cursor = start + length;
  }
  if (cursor < text.length) add(cursor, text.length, false);
  if (clipBy) {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (chunk.match) continue;
      const words = chunk.text.split(" "),
        left = i > 0,
        right = i + 1 < chunks.length;
      if (words.length <= clipBy * (left && right ? 2 : 1)) continue;
      if (left && right)
        chunk.text =
          words.slice(0, clipBy).join(" ") +
          " ... " +
          words.slice(-clipBy).join(" ");
      else if (left) chunk.text = words.slice(0, clipBy).join(" ") + " ...";
      else if (right) chunk.text = "... " + words.slice(-clipBy).join(" ");
    }
  }
  return chunks;
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = highlightWords;
