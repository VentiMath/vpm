"use strict";
const { own } = require("./resources.cjs");
const list = (x) =>
  x === false || x == null ? [] : Array.isArray(x) ? [...x] : [x];
function fallbackCodes(fallback, code) {
  if (typeof fallback === "function") fallback = fallback(code);
  if (fallback && typeof fallback === "object" && !Array.isArray(fallback)) {
    const base = code?.split("-")[0],
      script = code?.split("-").slice(0, -1).join("-");
    return list(
      (own(fallback, code) && fallback[code]) ||
        (own(fallback, script) && fallback[script]) ||
        (own(fallback, base) && fallback[base]) ||
        fallback.default,
    );
  }
  return list(fallback);
}
function hierarchy(code, options) {
  const out = [];
  const add = (x) => {
    if (!x || out.includes(x)) return;
    if (
      options.supportedLngs &&
      !options.supportedLngs.includes(x) &&
      !(
        options.nonExplicitSupportedLngs &&
        options.supportedLngs.includes(x.split("-")[0])
      )
    )
      return;
    out.push(x);
  };
  const codes = list(code);
  for (const original of codes) {
    let normalized = original;
    try {
      normalized = Intl.getCanonicalLocales(original)[0];
    } catch {}
    if (options.lowerCaseLng) normalized = normalized.toLowerCase();
    const parts = normalized.split("-");
    if (options.load !== "languageOnly") add(normalized);
    if (
      parts.length > 2 &&
      options.load !== "languageOnly" &&
      options.load !== "currentOnly"
    )
      add(parts.slice(0, -1).join("-"));
    if (options.load !== "currentOnly") add(parts[0]);
  }
  for (const f of fallbackCodes(options.fallbackLng, codes[0])) add(f);
  return out;
}
const plurals = new Map();
function suffix(lng, count, options) {
  const type = options.ordinal ? "ordinal" : "cardinal",
    key = lng + "/" + type;
  let rule = plurals.get(key);
  if (!rule) {
    try {
      rule = new Intl.PluralRules(lng, { type });
    } catch {
      rule = new Intl.PluralRules("en", { type });
    }
    if (plurals.size >= 128) plurals.delete(plurals.keys().next().value);
    plurals.set(key, rule);
  }
  return (
    (options.pluralSeparator ?? "_") +
    (options.ordinal ? "ordinal_" : "") +
    rule.select(count)
  );
}
const rtl = new Set([
  "ar",
  "he",
  "fa",
  "ur",
  "ps",
  "sd",
  "ug",
  "yi",
  "dv",
  "ku",
  "ckb",
  "syr",
  "nqo",
  "sam",
  "arc",
  "pnb",
  "ks",
  "bal",
  "bqi",
  "glk",
  "mzn",
  "lrc",
  "azb",
]);
const dir = (lng) => {
  const p = (lng || "").toLowerCase().split("-");
  if (p.includes("latn") || p.includes("cyrl")) return "ltr";
  return p.includes("arab") || p.includes("hebr") || rtl.has(p[0])
    ? "rtl"
    : "ltr";
};
module.exports = { list, hierarchy, fallbackCodes, suffix, dir };
