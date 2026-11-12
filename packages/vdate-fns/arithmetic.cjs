"use strict";
const invalid = () => new Date(NaN);
const toDate = (value) => new Date(value);
const getters = [
  "Date",
  "Hours",
  "Minutes",
  "Month",
  "Seconds",
  "Milliseconds",
  "Year",
];
const api = {
  toDate,
  isValid: (v) =>
    (v instanceof Date || typeof v === "number") && !Number.isNaN(+toDate(v)),
};
for (const field of getters) {
  const key = field === "Year" ? "FullYear" : field;
  api["get" + field] = (v) => toDate(v)["get" + key]();
  api["set" + field] = (v, n) => {
    const d = toDate(v);
    if (Number.isNaN(+d)) return d;
    d["set" + key](n);
    return d;
  };
}
const midnight = (d) => {
  d.setHours(0, 0, 0, 0);
  return d;
};
api.startOfDay = (v) => midnight(toDate(v));
api.startOfMonth = (v) => {
  const d = toDate(v);
  d.setDate(1);
  return midnight(d);
};
api.startOfYear = (v) => {
  const d = toDate(v);
  d.setMonth(0, 1);
  return midnight(d);
};
api.endOfDay = (v) => {
  const d = toDate(v);
  d.setHours(23, 59, 59, 999);
  return d;
};
api.endOfMonth = (v) => {
  const d = toDate(v);
  d.setMonth(d.getMonth() + 1, 0);
  return api.endOfDay(d);
};
api.endOfYear = (v) => {
  const d = toDate(v);
  d.setMonth(11, 31);
  return api.endOfDay(d);
};
api.getDaysInMonth = (v) => api.endOfMonth(v).getDate();
api.addDays = (v, n) => {
  const d = toDate(v);
  if (n) d.setDate(d.getDate() + Math.trunc(n));
  else if (Number.isNaN(n)) return invalid();
  return d;
};
api.addWeeks = (v, n) => api.addDays(v, n * 7);
api.addMonths = (v, n) => {
  const d = toDate(v);
  n = Math.trunc(n);
  if (!n) return Number.isNaN(n) ? invalid() : d;
  const day = d.getDate(),
    target = toDate(d);
  target.setMonth(d.getMonth() + n + 1, 0);
  if (day >= target.getDate()) return target;
  d.setFullYear(target.getFullYear(), target.getMonth(), day);
  return d;
};
api.addYears = (v, n) => api.addMonths(v, n * 12);
api.setMonth = (v, n) => {
  const d = toDate(v),
    day = d.getDate();
  d.setDate(1);
  d.setMonth(n);
  d.setDate(Math.min(day, api.getDaysInMonth(d)));
  return d;
};
for (const [unit, multiple] of [
  ["Milliseconds", 1],
  ["Seconds", 1000],
  ["Minutes", 60000],
  ["Hours", 3600000],
])
  api["add" + unit] = (v, n) => new Date(+toDate(v) + n * multiple);
api.sub = (v, o) => {
  let d = api.addMonths(v, -((o.years || 0) * 12 + (o.months || 0)));
  d = api.addDays(d, -((o.weeks || 0) * 7 + (o.days || 0)));
  return new Date(
    +d -
      ((o.hours || 0) * 3600 + (o.minutes || 0) * 60 + (o.seconds || 0)) * 1000,
  );
};
function weekOptions(o = {}) {
  const start = o.weekStartsOn ?? o.locale?.options?.weekStartsOn ?? 0;
  const first =
    o.firstWeekContainsDate ?? o.locale?.options?.firstWeekContainsDate ?? 1;
  if (
    !Number.isInteger(start) ||
    start < 0 ||
    start > 6 ||
    !Number.isInteger(first) ||
    first < 1 ||
    first > 7
  )
    throw new RangeError("Invalid week options");
  return [start, first];
}
api.startOfWeek = (v, o) => {
  const d = toDate(v),
    [start] = weekOptions(o);
  d.setDate(d.getDate() - ((d.getDay() - start + 7) % 7));
  return midnight(d);
};
api.endOfWeek = (v, o) => api.endOfDay(api.addDays(api.startOfWeek(v, o), 6));
api.getWeek = (v, o) => {
  const d = toDate(v),
    [, first] = weekOptions(o),
    y = d.getFullYear();
  const begin = (year) => {
    const a = new Date(0);
    a.setFullYear(year, 0, first);
    return api.startOfWeek(a, o);
  };
  const start =
    d >= begin(y + 1) ? begin(y + 1) : d >= begin(y) ? begin(y) : begin(y - 1);
  return Math.round((+api.startOfWeek(d, o) - +start) / 604800000) + 1;
};
for (const [name, compare] of [
  ["isAfter", (a, b) => a > b],
  ["isBefore", (a, b) => a < b],
  ["isEqual", (a, b) => a === b],
])
  api[name] = (a, b) => compare(+toDate(a), +toDate(b));
for (const [name, parts] of [
  ["Year", ["FullYear"]],
  ["Month", ["FullYear", "Month"]],
  ["Day", ["FullYear", "Month", "Date"]],
  ["Hour", ["FullYear", "Month", "Date", "Hours"]],
])
  api["isSame" + name] = (a, b) => {
    a = toDate(a);
    b = toDate(b);
    return parts.every((p) => a["get" + p]() === b["get" + p]());
  };
api.isWithinInterval = (v, { start, end }) => {
  const n = +toDate(v),
    a = +toDate(start),
    b = +toDate(end);
  return n >= Math.min(a, b) && n <= Math.max(a, b);
};
api.isToday = (v) => api.isSameDay(v, new Date());
api.isYesterday = (v) => api.isSameDay(v, api.addDays(new Date(), -1));
api.isThisYear = (v) => api.isSameYear(v, new Date());
module.exports = api;
