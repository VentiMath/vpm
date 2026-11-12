"use strict";
const months =
  "January February March April May June July August September October November December".split(
    " ",
  );
const days = "Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(
  " ",
);
const ordinal = (n) =>
  n +
  ([11, 12, 13].includes(n % 100)
    ? "th"
    : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
const widths = ["short", "medium", "long", "full"];
const date = ["MM/dd/yyyy", "MMM d, y", "MMMM do, y", "EEEE, MMMM do, y"];
const time = ["h:mm a", "h:mm:ss a", "h:mm:ss a z", "h:mm:ss a zzzz"];
const formatLong = {
  date: ({ width = "full" } = {}) => date[widths.indexOf(width)] ?? date[3],
  time: ({ width = "full" } = {}) => time[widths.indexOf(width)] ?? time[3],
  dateTime: ({ width = "full" } = {}) =>
    width === "short" || width === "medium"
      ? "{{date}}, {{time}}"
      : "{{date}} 'at' {{time}}",
};
function localName(values, n, { width = "wide" } = {}) {
  return width === "narrow"
    ? values[n]?.[0]
    : width === "abbreviated"
      ? values[n]?.slice(0, 3)
      : width === "short"
        ? values[n]?.slice(0, 2)
        : values[n];
}
const localize = {
  ordinalNumber: ordinal,
  month: (n, o) => localName(months, n, o),
  day: (n, o) => localName(days, n, o),
  quarter: (n, { width = "wide" } = {}) =>
    width === "narrow"
      ? String(n)
      : width === "abbreviated"
        ? "Q" + n
        : ordinal(n) + " quarter",
  era: (n, { width = "wide" } = {}) =>
    width === "narrow"
      ? ["B", "A"][n]
      : width === "abbreviated"
        ? ["BC", "AD"][n]
        : ["Before Christ", "Anno Domini"][n],
  dayPeriod: (p, { width = "wide" } = {}) =>
    p === "am" || p === "pm"
      ? width === "narrow"
        ? p[0]
        : width === "wide"
          ? p[0] + ".m."
          : p.toUpperCase()
      : {
          midnight: "midnight",
          noon: "noon",
          morning: "in the morning",
          afternoon: "in the afternoon",
          evening: "in the evening",
          night: "at night",
        }[p],
};
const enUS = {
  code: "en-US",
  formatLong,
  localize,
  options: { weekStartsOn: 0, firstWeekContainsDate: 1 },
};
module.exports = { enUS, months, days, ordinal };
