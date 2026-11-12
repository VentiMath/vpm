"use strict";
const { toDate, getWeek } = require("./arithmetic.cjs");
const { enUS, months, days, ordinal } = require("./locale.cjs");
const pad = (n, width = 2) => String(Math.abs(n)).padStart(width, "0");
function locale(options) {
  if (options?.locale && options.locale.code !== "en-US")
    throw new RangeError("vdate-fns currently supports the en-US locale");
  return enUS;
}
const width = (n) => ["short", "medium", "long", "full"][Math.min(n, 4) - 1];
const longFormatters = {
  p: (token, fl) => fl.time({ width: width(token.length) }),
  P: (token, fl) => {
    const [, d, t] = token.match(/^(P+)(p+)?$/);
    const a = fl.date({ width: width(d.length) });
    return t
      ? fl
          .dateTime({ width: width(d.length) })
          .replace("{{date}}", a)
          .replace("{{time}}", fl.time({ width: width(t.length) }))
      : a;
  },
};
const cache = new Map();
function tokenize(pattern) {
  if (typeof pattern !== "string")
    throw new TypeError("Date format must be a string");
  const prior = cache.get(pattern);
  if (prior) return prior;
  const tokens = [];
  for (let i = 0; i < pattern.length; ) {
    let c = pattern[i++];
    if (c === "'") {
      let s = "";
      if (pattern[i] === "'") {
        i++;
        s = "'";
      } else {
        while (i < pattern.length) {
          c = pattern[i++];
          if (c === "'") {
            if (pattern[i] === "'") {
              i++;
              s += "'";
              continue;
            }
            break;
          }
          s += c;
        }
      }
      tokens.push({ literal: s });
      continue;
    }
    if (/[A-Za-z]/.test(c)) {
      let token = c;
      while (pattern[i] === c) {
        token += pattern[i++];
      }
      if (pattern[i] === "o" && "yQqMLwIdDecihHKkms".includes(c))
        token += pattern[i++];
      if (c === "P" || c === "p") {
        if (c === "P") while (pattern[i] === "p") token += pattern[i++];
        tokens.push(...tokenize(longFormatters[c](token, enUS.formatLong)));
      } else tokens.push({ token });
    } else tokens.push({ literal: c });
  }
  if (cache.size >= 256) cache.delete(cache.keys().next().value);
  cache.set(pattern, tokens);
  return tokens;
}
function zone(d, colon, seconds = false) {
  const offset = -d.getTimezoneOffset(),
    a = Math.abs(offset);
  return (
    (offset >= 0 ? "+" : "-") +
    pad(Math.floor(a / 60)) +
    (colon ? ":" : "") +
    pad(a % 60) +
    (seconds ? (colon ? ":00" : "00") : "")
  );
}
function renderToken(d, t, options) {
  const c = t[0],
    n = t.length,
    ord = t.endsWith("o"),
    num = (x) => (ord ? ordinal(x) : (x < 0 ? "-" : "") + pad(x, n));
  const y = d.getFullYear(),
    m = d.getMonth(),
    day = d.getDay(),
    h = d.getHours();
  switch (c) {
    case "y":
      return ord
        ? ordinal(y > 0 ? y : 1 - y)
        : n === 2
          ? pad((y > 0 ? y : 1 - y) % 100)
          : pad(y > 0 ? y : 1 - y, n);
    case "u":
      return (y < 0 ? "-" : "") + pad(y, n);
    case "G":
      return enUS.localize.era(y > 0 ? 1 : 0, {
        width: n <= 3 ? "abbreviated" : n === 4 ? "wide" : "narrow",
      });
    case "M":
    case "L":
      return ord
        ? ordinal(m + 1)
        : n <= 2
          ? num(m + 1)
          : n === 3
            ? months[m].slice(0, 3)
            : n === 4
              ? months[m]
              : months[m][0];
    case "d":
      return num(d.getDate());
    case "E":
    case "e":
    case "c":
    case "i": {
      const value =
        c === "i"
          ? day || 7
          : ((day - (options?.weekStartsOn ?? 0) + 7) % 7) + 1;
      if (c !== "E" && (n <= 2 || ord)) return num(value);
      return n <= 3
        ? days[day].slice(0, 3)
        : n === 4
          ? days[day]
          : n === 5
            ? days[day][0]
            : days[day].slice(0, 2);
    }
    case "a": {
      const a = h < 12 ? "AM" : "PM";
      return n <= 2
        ? a
        : n === 3
          ? a.toLowerCase()
          : n === 4
            ? a[0].toLowerCase() + ".m."
            : a[0].toLowerCase();
    }
    case "h":
      return num(h % 12 || 12);
    case "H":
      return num(h);
    case "K":
      return num(h % 12);
    case "k":
      return num(h || 24);
    case "m":
      return num(d.getMinutes());
    case "s":
      return num(d.getSeconds());
    case "S":
      return pad(d.getMilliseconds(), 3).slice(0, n).padEnd(n, "0");
    case "Q":
    case "q": {
      const q = Math.floor(m / 3) + 1;
      return ord
        ? ordinal(q)
        : n <= 2
          ? num(q)
          : n === 3
            ? "Q" + q
            : n === 4
              ? ordinal(q) + " quarter"
              : String(q);
    }
    case "w":
      return num(getWeek(d, options));
    case "X":
    case "x":
      return c === "X" && d.getTimezoneOffset() === 0
        ? "Z"
        : n === 1 && d.getTimezoneOffset() % 60 === 0
          ? zone(d, false).slice(0, 3)
          : zone(d, n === 3 || n === 5);
    case "z":
    case "O":
      return (
        "GMT" +
        (n < 4
          ? zone(d, true)
              .replace(/^([+-])0/, "$1")
              .replace(/:00$/, "")
          : zone(d, true))
      );
    case "t":
      return num(Math.floor(+d / 1000));
    case "T":
      return num(+d);
    default:
      throw new RangeError("Unsupported date token: " + t);
  }
}
function format(value, pattern, options) {
  locale(options);
  const d = toDate(value);
  if (Number.isNaN(+d)) throw new RangeError("Invalid time value");
  return tokenize(pattern)
    .map((p) => p.literal ?? renderToken(d, p.token, options))
    .join("");
}
function formatISO(value, options = {}) {
  const d = toDate(value);
  if (Number.isNaN(+d)) throw new RangeError("Invalid time value");
  const basic = options.format === "basic",
    sep = basic ? "" : "-",
    y = d.getFullYear();
  const date =
      (y < 0 ? "-" : "") +
      pad(y, 4) +
      sep +
      pad(d.getMonth() + 1) +
      sep +
      pad(d.getDate()),
    time =
      [d.getHours(), d.getMinutes(), d.getSeconds()]
        .map((n) => pad(n))
        .join(basic ? "" : ":") +
      (d.getTimezoneOffset() === 0 ? "Z" : zone(d, true));
  return options.representation === "date"
    ? date
    : options.representation === "time"
      ? time
      : date + "T" + time;
}
module.exports = { format, formatISO, longFormatters, tokenize, locale };
