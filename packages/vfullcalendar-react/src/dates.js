import {
  DateEnv,
  NativeDateFormatter,
  FuncDateFormatter,
  createDuration,
  startOfDay,
  addDays,
} from "vfull-ui-headless-calendar";
export { createDuration, startOfDay, addDays };
export const DAY = 86400000;
export function environment(options = {}) {
  const locale = typeof options.locale === "object" ? options.locale : {};
  const code =
    typeof options.locale === "string" ? options.locale : locale.code || "en";
  return new DateEnv({
    calendarSystem: "gregory",
    timeZone: options.timeZone || "local",
    firstDay: options.firstDay,
    locale: {
      codes: [code],
      week: { dow: 0, doy: 4, ...locale.week },
      simpleNumberFormat: new Intl.NumberFormat(code),
      options: { direction: options.direction || locale.direction || "ltr" },
    },
    weekNumberCalculation: options.weekNumberCalculation,
    weekTextLong: "Week",
    weekTextShort: "W",
  });
}
export const stamp = (marker) => marker.toISOString().slice(0, 10);
export function marker(env, input) {
  const value = env.createMarker(input);
  if (!value) throw new RangeError("Invalid calendar date");
  return value;
}
export function formatMarker(env, value, options = {}) {
  const formatter =
    typeof options === "function"
      ? new FuncDateFormatter(options)
      : new NativeDateFormatter(options);
  return env
    .formatToParts(value, formatter)
    .map((x) => x.value)
    .join("");
}
export function formatDate(input, options = {}) {
  const env = environment(options);
  return formatMarker(env, marker(env, input), options);
}
export function formatRange(start, end, options = {}) {
  const env = environment(options),
    formatter = new NativeDateFormatter(options);
  return env
    .formatRangeToParts(marker(env, start), marker(env, end), formatter, {
      isEndExclusive: options.isEndExclusive,
    })
    .map((x) => x.value)
    .join("");
}
export function monthShift(date, n) {
  const result = new Date(+date),
    day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + n);
  const last = new Date(+result);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  result.setUTCDate(Math.min(day, last.getUTCDate()));
  return result;
}
export function range(env, date, type, options) {
  let currentStart, currentEnd, start, end;
  if (type === "dayGridMonth") {
    currentStart = env.startOfMonth(date);
    currentEnd = env.addMonths(currentStart, 1);
    start = env.startOfWeek(currentStart);
    end = env.startOfWeek(currentEnd);
    if (+end < +currentEnd) end = addDays(end, 7);
    if (options.fixedWeekCount !== false) end = addDays(start, 42);
  } else if (type === "timeGridWeek" || type === "dayGridWeek") {
    currentStart = env.startOfWeek(date);
    currentEnd = addDays(currentStart, 7);
    start = currentStart;
    end = currentEnd;
  } else if (type === "timeGridDay" || type === "dayGridDay") {
    currentStart = startOfDay(date);
    currentEnd = addDays(currentStart, 1);
    start = currentStart;
    end = currentEnd;
  } else throw new RangeError("Unsupported calendar view: " + type);
  const days = [];
  for (let d = start; +d < +end; d = addDays(d, 1))
    if (options.weekends !== false || ![0, 6].includes(d.getUTCDay()))
      days.push(d);
  const titleOptions =
    options.views?.[type]?.titleFormat ||
    options.titleFormat ||
    (type === "dayGridMonth"
      ? { year: "numeric", month: "long" }
      : type.endsWith("Day")
        ? { year: "numeric", month: "long", day: "numeric" }
        : { year: "numeric", month: "long" });
  const title =
    type.endsWith("Week") && titleOptions.day
      ? env
          .formatRangeToParts(
            currentStart,
            addDays(currentEnd, -1),
            new NativeDateFormatter(titleOptions),
          )
          .map((x) => x.value)
          .join("")
      : formatMarker(env, currentStart, titleOptions);
  return { type, title, currentStart, currentEnd, start, end, days };
}
export function minutes(value, fallback = 0) {
  if (typeof value === "number") return value / 60000;
  if (typeof value === "string") {
    const parts = value.split(":").map(Number);
    if (parts.every(Number.isFinite))
      return parts[0] * 60 + (parts[1] || 0) + (parts[2] || 0) / 60;
  }
  if (value && typeof value === "object") {
    const d = createDuration(value);
    return d.days * 1440 + d.milliseconds / 60000;
  }
  return fallback;
}
