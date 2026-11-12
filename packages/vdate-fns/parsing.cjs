"use strict";
const { toDate, addDays } = require("./arithmetic.cjs");
const { tokenize, locale } = require("./formatting.cjs");
const { months, days } = require("./locale.cjs");
const invalid = () => new Date(NaN);
const leap = (y) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
const monthDays = (y, m) =>
  [31, leap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
function makeDate(y, m, d, h = 0, min = 0, s = 0, ms = 0, utc = false) {
  const v = new Date(0);
  if (utc) {
    v.setUTCFullYear(y, m - 1, d);
    v.setUTCHours(h, min, s, ms);
  } else {
    v.setFullYear(y, m - 1, d);
    v.setHours(h, min, s, ms);
  }
  return v;
}
const isoYears = [0, 1, 2].map(
  (a) => new RegExp("^([+-]\\d{" + (4 + a) + "}|\\d{4}|\\d{2})(.*)$"),
);
function parseISO(input, options = {}) {
  if (typeof input !== "string") return invalid();
  const a = options.additionalDigits ?? 2;
  if (![0, 1, 2].includes(a))
    throw new RangeError("additionalDigits must be 0, 1 or 2");
  const found = input.match(isoYears[a]);
  if (!found) return invalid();
  let y = Number(found[1]),
    tail = found[2],
    m = 1,
    d = 1;
  if (found[1].length === 2) y *= 100;
  const split = tail.split(/[T ]/);
  if (split.length > 2) return invalid();
  const date = split[0];
  if (date) {
    let hit;
    if ((hit = date.match(/^-?W(\d{2})(?:-?(\d))?$/))) {
      const week = +hit[1],
        dow = +(hit[2] ?? 1);
      if (week < 1 || week > 53 || dow < 1 || dow > 7) return invalid();
      const jan4 = makeDate(y, 1, 4, 0, 0, 0, 0, true);
      jan4.setUTCDate(
        4 - (jan4.getUTCDay() || 7) + 1 + (week - 1) * 7 + dow - 1,
      );
      y = jan4.getUTCFullYear();
      m = jan4.getUTCMonth() + 1;
      d = jan4.getUTCDate();
    } else if ((hit = date.match(/^-?(\d{3})$/))) {
      const day = +hit[1];
      if (day < 1 || day > (leap(y) ? 366 : 365)) return invalid();
      const v = makeDate(y, 1, day, 0, 0, 0, 0, true);
      m = v.getUTCMonth() + 1;
      d = v.getUTCDate();
    } else if ((hit = date.match(/^-?(\d{2})(?:-?(\d{2}))?$/))) {
      m = +hit[1];
      d = +(hit[2] ?? 1);
    } else return invalid();
  }
  if (m < 1 || m > 12 || d < 1 || d > monthDays(y, m)) return invalid();
  let h = 0,
    min = 0,
    s = 0,
    ms = 0,
    offset = null;
  if (split.length === 2) {
    let t = split[1],
      z = t.match(/(Z|[+-]\d{2}(?::?\d{2})?)$/);
    if (z) {
      t = t.slice(0, -z[0].length);
      if (z[0] === "Z") offset = 0;
      else {
        const digits = z[0].slice(1).replace(":", ""),
          hh = +digits.slice(0, 2),
          mm = +(digits.slice(2) || 0);
        if (mm > 59) return invalid();
        offset = (hh * 60 + mm) * (z[0][0] === "+" ? 1 : -1);
      }
    }
    const hit = t.match(
      /^(\d{2})(?:[.,](\d+)|:?(\d{2})(?:[.,](\d+)|:?(\d{2})(?:[.,](\d+))?)?)?$/,
    );
    if (!hit) return invalid();
    h = +hit[1];
    min = +(hit[3] || 0);
    s = +(hit[5] || 0);
    let fraction = hit[2]
      ? Number("0." + hit[2]) * 3600000
      : hit[4]
        ? Number("0." + hit[4]) * 60000
        : hit[6]
          ? Number("0." + hit[6]) * 1000
          : 0;
    if (h > 24 || min > 59 || s > 59 || (h === 24 && (min || s || fraction)))
      return invalid();
    ms = fraction;
  }
  if (offset !== null && (y < 0 || y >= 100))
    return new Date(Date.UTC(y, m - 1, d, h, min, s, ms) - offset * 60000);
  const result = makeDate(y, m, d, h, min, s, ms, offset !== null);
  if (offset !== null) result.setTime(+result - offset * 60000);
  return result;
}
function parse(input, pattern, reference, options) {
  locale(options);
  if (typeof input !== "string") return invalid();
  const ref = toDate(reference);
  if (Number.isNaN(+ref)) return invalid();
  let rest = input,
    y = ref.getFullYear(),
    m = ref.getMonth() + 1,
    d = ref.getDate(),
    h = 0,
    minute = 0,
    s = 0,
    ms = 0,
    meridiem,
    hasDate = false,
    hasMonth = false,
    hasYear = false,
    weekday;
  const seen = new Set();
  const tokens = tokenize(pattern);
  for (const part of tokens) {
    if (part.literal !== undefined) {
      if (!rest.startsWith(part.literal)) return invalid();
      rest = rest.slice(part.literal.length);
      continue;
    }
    const t = part.token,
      c = t[0],
      n = t.length,
      ord = t.endsWith("o");
    let match, value;
    const category = "ML".includes(c)
      ? "month"
      : "ecEi".includes(c)
        ? "weekday"
        : "hHkK".includes(c)
          ? "hour"
          : c;
    if (seen.has(category))
      throw new RangeError("Incompatible repeated date tokens");
    seen.add(category);
    if (c === "a") {
      match = rest.match(/^(a\.?m\.?|p\.?m\.?|a|p)/i);
      if (!match) return invalid();
      meridiem = match[0][0].toLowerCase() === "p" ? 12 : 0;
    } else if (
      ("ML".includes(c) && n >= 3 && !ord) ||
      ("ecEi".includes(c) && (n >= 3 || c === "E"))
    ) {
      const names = "ML".includes(c) ? months : days;
      const candidates = names
        .map((v, i) => ({
          value: i,
          text:
            n <= 3
              ? v.slice(0, 3)
              : n === 4
                ? v
                : n === 5
                  ? v[0]
                  : v.slice(0, 2),
        }))
        .sort((a, b) => b.text.length - a.text.length);
      const found = candidates.find((v) =>
        rest.toLowerCase().startsWith(v.text.toLowerCase()),
      );
      if (!found) return invalid();
      match = [rest.slice(0, found.text.length)];
      value = found.value + ("ML".includes(c) ? 1 : 0);
    } else {
      if (!"yuMLdecihHkKmsS".includes(c))
        throw new RangeError("Unsupported parsing token: " + t);
      const max =
        c === "y" || c === "u" ? (n === 1 ? 4 : n) : c === "S" ? n : 2;
      match = rest.match(
        new RegExp(
          "^" +
            (c === "u" ? "[+-]?" : "") +
            "\\d{1," +
            max +
            "}" +
            (ord ? "(?:st|nd|rd|th)?" : ""),
          "i",
        ),
      );
      if (!match) return invalid();
      value = parseInt(match[0], 10);
    }
    rest = rest.slice(match[0].length);
    switch (c) {
      case "y":
      case "u":
        if (c === "y" && n !== 2 && value === 0) return invalid();
        y = value;
        if (c === "y" && n === 2) {
          const base = ref.getFullYear();
          y = Math.floor(base / 100) * 100 + value;
          if (y >= base + 50) y -= 100;
          else if (y < base - 50) y += 100;
        }
        hasYear = true;
        break;
      case "M":
      case "L":
        if (value < 1 || value > 12) return invalid();
        m = value;
        hasMonth = true;
        break;
      case "d":
        if (value < 1 || value > 31) return invalid();
        d = value;
        hasDate = true;
        break;
      case "E":
      case "e":
      case "c":
      case "i":
        weekday =
          n >= 3 || c === "E"
            ? value
            : c === "i"
              ? value % 7
              : (value - 1 + (options?.weekStartsOn ?? 0)) % 7;
        if (
          n >= 3 || c === "E" ? value < 0 || value > 6 : value < 1 || value > 7
        )
          return invalid();
        break;
      case "h":
        if (value < 1 || value > 12) return invalid();
        h = value % 12;
        break;
      case "H":
        if (value > 23) return invalid();
        h = value;
        break;
      case "K":
        if (value > 11) return invalid();
        h = value;
        break;
      case "k":
        if (value < 1 || value > 24) return invalid();
        h = value % 24;
        break;
      case "m":
        if (value > 59) return invalid();
        minute = value;
        break;
      case "s":
        if (value > 59) return invalid();
        s = value;
        break;
      case "S":
        ms = Math.trunc(value * Math.pow(10, 3 - n));
        break;
    }
  }
  if (rest.trim()) return invalid();
  if (
    (tokens.some((p) => p.token?.[0] === "H") ||
      tokens.some((p) => p.token?.[0] === "k")) &&
    meridiem !== undefined
  )
    throw new RangeError("24-hour time cannot use a meridiem");
  if (hasYear && !hasMonth) m = 1;
  if ((hasYear || hasMonth) && !hasDate) d = 1;
  if (d > monthDays(y, m)) return invalid();
  if (!seen.size) return ref;
  if (
    !hasYear &&
    !hasMonth &&
    !hasDate &&
    weekday === undefined &&
    !seen.has("hour") &&
    meridiem === undefined
  ) {
    h = ref.getHours();
    if (!seen.has("m")) minute = ref.getMinutes();
    if (!seen.has("m") && !seen.has("s")) s = ref.getSeconds();
  }
  if (meridiem !== undefined) h += meridiem;
  let result = makeDate(y, m, d, h, minute, s, ms);
  if (weekday !== undefined && !hasDate) {
    const start = tokens.some((p) => p.token?.[0] === "i")
      ? 1
      : (options?.weekStartsOn ?? 0);
    result = addDays(
      result,
      ((weekday - start + 7) % 7) - ((result.getDay() - start + 7) % 7),
    );
  }
  return result;
}
module.exports = { parse, parseISO };
