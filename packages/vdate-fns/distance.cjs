"use strict";
const { toDate } = require("./arithmetic.cjs");
const { locale } = require("./formatting.cjs");
const plural = (n, unit) => n + " " + unit + (n === 1 ? "" : "s");
function distanceParts(value, base, options) {
  locale(options);
  const a = toDate(value),
    b = toDate(base);
  if (Number.isNaN(+a) || Number.isNaN(+b))
    throw new RangeError("Invalid time value");
  const start = a < b ? a : b,
    end = a < b ? b : a,
    seconds = (end - start) / 1000;
  return {
    a,
    b,
    start,
    end,
    seconds,
    minutes:
      seconds / 60 - (end.getTimezoneOffset() - start.getTimezoneOffset()),
  };
}
function suffix(text, a, b, options) {
  return options?.addSuffix ? (a > b ? "in " + text : text + " ago") : text;
}
function formatDistanceStrict(value, base, options = {}) {
  const p = distanceParts(value, base, options),
    elapsed = p.seconds / 60,
    days = p.minutes / 1440;
  const unit =
    options.unit ??
    (elapsed < 1
      ? "second"
      : elapsed < 60
        ? "minute"
        : elapsed < 1440
          ? "hour"
          : days < 30
            ? "day"
            : days < 365
              ? "month"
              : "year");
  const raw = {
    second: p.seconds,
    minute: elapsed,
    hour: elapsed / 60,
    day: days,
    month: days / 30,
    year: days / 365,
  }[unit];
  if (raw === undefined) throw new RangeError("Invalid distance unit");
  const round = {
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    trunc: Math.trunc,
  }[options.roundingMethod ?? "round"];
  if (!round) throw new RangeError("Invalid rounding method");
  let n = round(raw),
    text =
      unit === "month" && n === 12 && !options.unit
        ? "1 year"
        : plural(n, unit);
  return suffix(text, p.a, p.b, options);
}
function formatDistance(value, base, options = {}) {
  const p = distanceParts(value, base, options),
    min = Math.round(p.minutes),
    seconds = Math.trunc(p.seconds);
  let text;
  if (min < 2) {
    if (options.includeSeconds)
      text =
        seconds < 5
          ? "less than 5 seconds"
          : seconds < 10
            ? "less than 10 seconds"
            : seconds < 20
              ? "less than 20 seconds"
              : seconds < 40
                ? "half a minute"
                : seconds < 60
                  ? "less than a minute"
                  : "1 minute";
    else text = min === 0 ? "less than a minute" : plural(min, "minute");
  } else if (min < 45) text = plural(min, "minute");
  else if (min < 90) text = "about 1 hour";
  else if (min < 1440) text = "about " + plural(Math.round(min / 60), "hour");
  else if (min < 2520) text = "1 day";
  else if (min < 43200) text = plural(Math.round(min / 1440), "day");
  else if (min < 86400)
    text = "about " + plural(Math.round(min / 43200), "month");
  else {
    let months =
      (p.end.getFullYear() - p.start.getFullYear()) * 12 +
      p.end.getMonth() -
      p.start.getMonth();
    const endClock = [
      p.end.getDate(),
      p.end.getHours(),
      p.end.getMinutes(),
      p.end.getSeconds(),
      p.end.getMilliseconds(),
    ];
    const startClock = [
      p.start.getDate(),
      p.start.getHours(),
      p.start.getMinutes(),
      p.start.getSeconds(),
      p.start.getMilliseconds(),
    ];
    for (let i = 0; i < endClock.length; i++) {
      if (endClock[i] !== startClock[i]) {
        if (endClock[i] < startClock[i]) months--;
        break;
      }
    }
    if (months < 12) text = plural(Math.round(min / 43200), "month");
    else {
      const years = Math.floor(months / 12),
        extra = months % 12;
      text =
        extra < 3
          ? "about " + plural(years, "year")
          : extra < 9
            ? "over " + plural(years, "year")
            : "almost " + plural(years + 1, "year");
    }
  }
  return suffix(text, p.a, p.b, options);
}
const formatDistanceToNow = (value, options) =>
  formatDistance(value, Date.now(), options);
const formatDistanceToNowStrict = (value, options) =>
  formatDistanceStrict(value, Date.now(), options);
module.exports = {
  formatDistance,
  formatDistanceStrict,
  formatDistanceToNow,
  formatDistanceToNowStrict,
};
