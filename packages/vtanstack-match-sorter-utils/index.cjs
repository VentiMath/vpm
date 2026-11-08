"use strict";
const rankings = Object.freeze({
  CASE_SENSITIVE_EQUAL: 7,
  EQUAL: 6,
  STARTS_WITH: 5,
  WORD_STARTS_WITH: 4,
  CONTAINS: 3,
  ACRONYM: 2,
  MATCHES: 1,
  NO_MATCH: 0,
});
// Canonical decomposition covers accented Latin letters. These non-decomposing
// letter forms retain the ranking API's established ASCII expansions.
const forms = {
  Æ: "AE",
  æ: "ae",
  Œ: "OE",
  œ: "oe",
  Ĳ: "IJ",
  ĳ: "ij",
  Ð: "D",
  ð: "d",
  Þ: "TH",
  þ: "th",
  Ø: "O",
  ø: "o",
  Đ: "D",
  đ: "d",
  Ħ: "H",
  ħ: "h",
  ı: "i",
  Ŀ: "L",
  ŀ: "l",
  Ł: "L",
  ł: "l",
  ŉ: "n",
  Ŧ: "T",
  ŧ: "t",
  ſ: "s",
  ƒ: "f",
};
const nonAscii = /[^\x00-\x7f]/;
const latin =
  /(?:[A-Za-zЕеИиГгКкƐɛƗɨ][\u0300-\u036f]+|[\u00c0-\u024f\u1e00-\u1eff][\u0300-\u036f]*|[ЁёЙйЃѓЌќ][\u0300-\u036f]*)/g;
const marks = /[\u0300-\u036f]/g;
function fold(text) {
  if (!nonAscii.test(text)) return text;
  return text.replace(latin, (part) => {
    // Preserve the existing cedilla transliterations of open E and barred I.
    if (part.includes("\u0327")) {
      if (part[0] === "Ɛ") return "E";
      if (part[0] === "ɛ") return "e";
      if (part[0] === "Ɨ") return "I";
      if (part[0] === "ɨ") return "i";
    }
    const letter = part[0];
    // The matched ranges contain fewer than 800 possible base characters. Cache
    // those single-character folds only, never caller strings or record data.
    if (forms[letter] !== undefined) return forms[letter];
    const base = letter.normalize("NFD").replace(marks, "");
    return (forms[letter] = forms[base] ?? base);
  });
}
function text(value, keep) {
  const string = typeof value === "string" ? value : `${value}`;
  return keep ? string : fold(string);
}
function score(haystack, needle) {
  if (needle.length > haystack.length) return 0;
  if (haystack === needle) return 7;
  haystack = haystack.toLowerCase();
  needle = needle.toLowerCase();
  if (haystack === needle) return 6;
  if (haystack.startsWith(needle)) return 5;
  if (haystack.includes(" " + needle)) return 4;
  if (haystack.includes(needle)) return 3;
  if (needle.length === 1) return 0;
  let acronym = "";
  for (let i = 0; i < haystack.length; i++) {
    if (
      (i === 0 || haystack[i - 1] === " " || haystack[i - 1] === "-") &&
      haystack[i] !== " " &&
      haystack[i] !== "-"
    )
      acronym += haystack[i];
  }
  if (acronym.includes(needle)) return 2;
  const first = haystack.indexOf(needle[0]);
  if (first < 0) return 0;
  let position = first;
  for (let i = 1; i < needle.length; i++) {
    position = haystack.indexOf(needle[i], position + 1);
    if (position < 0) return 0;
  }
  return 1 + 1 / (position - first);
}
function rankItem(item, value, options) {
  const opts = options || {},
    threshold = opts.threshold ?? 1,
    keep = opts.keepDiacritics;
  const result = {
    rankedValue: item,
    rank: 0,
    accessorIndex: -1,
    accessorThreshold: threshold,
    passed: false,
  };
  if (!opts.accessors) {
    result.rank = score(text(item, keep), text(value, keep));
    result.passed = result.rank >= threshold;
    return result;
  }
  // Invoke accessors once, in order, before ranking, without making an object
  // for every flattened value or writing defaults into the caller's options.
  const groups = [];
  for (const spec of opts.accessors) {
    const object = typeof spec === "object";
    const min =
      object && Object.hasOwn(spec, "minRanking") ? spec.minRanking : -Infinity;
    const max =
      object && Object.hasOwn(spec, "maxRanking") ? spec.maxRanking : Infinity;
    const limit =
      object && spec.threshold !== undefined ? spec.threshold : threshold;
    const found = (object ? spec.accessor : spec)(item);
    if (found != null)
      groups.push([
        Array.isArray(found) ? found : [String(found)],
        min,
        max,
        limit,
      ]);
  }
  let index = 0,
    prepared,
    ready = false;
  for (const [values, min, max, limit] of groups)
    for (let i = 0; i < values.length; i++, index++) {
      const candidate = text(values[i], keep);
      if (!ready) {
        prepared = text(value, keep);
        ready = true;
      }
      let rank = score(candidate, prepared);
      if (rank >= 1 && rank < min) rank = min;
      rank = Math.min(rank, max);
      if (rank >= limit && rank > result.rank) {
        result.rank = rank;
        result.passed = true;
        result.accessorIndex = index;
        result.accessorThreshold = limit;
        result.rankedValue = values[i];
      }
    }
  return result;
}
function compareItems(a, b) {
  return a.rank === b.rank ? 0 : a.rank > b.rank ? -1 : 1;
}
module.exports = { rankings, rankItem, compareItems };
