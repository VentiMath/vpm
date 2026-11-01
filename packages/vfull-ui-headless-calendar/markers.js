// Date markers encode calendar wall-clock fields in a UTC Date. Arithmetic on
// these markers must not consult the host time zone or mutate its inputs.
const DAY = 86400000;
export const isInt = value => value % 1 === 0;
export const trimEnd = value => value.trimEnd();
export const padStart = (value, length) => String(value).padStart(length, '0');
export const isValidDate = value => Number.isFinite(value.valueOf());
export const timeAsMs = date => date.getUTCHours() * 3600000 + date.getUTCMinutes() * 60000 + date.getUTCSeconds() * 1000 + date.getUTCMilliseconds();

export const dateToUtcArray = d => [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()];
export const dateToLocalArray = d => [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()];
export function arrayToUtcDate([year, month = 0, day = 1, hour = 0, minute = 0, second = 0, ms = 0]) {
  // Date.UTC treats 0..99 as 1900..1999. Gregorian fields repeat after 400 years.
  const shifted = year > -1 && year < 100;
  return new Date(Date.UTC(shifted ? year + 400 : year, month, day, hour, minute, second, ms) - (shifted ? 146097 * DAY : 0));
}
export function arrayToLocalDate([year, month = 0, day = 1, hour = 0, minute = 0, second = 0, ms = 0]) {
  const shifted = year > -1 && year < 100;
  const result = new Date(shifted ? year + 400 : year, month, day, hour, minute, second, ms);
  if (shifted) result.setFullYear(result.getFullYear() - 400);
  return result;
}
export const addMs = (date, count) => new Date(+date + count);
export function addDays(date, count) {
  const result = new Date(+date);
  result.setUTCDate(result.getUTCDate() + count);
  return result;
}
export const addWeeks = (date, count) => addDays(date, count * 7);
export const diffSeconds = (a, b) => (b - a) / 1000;
export const diffMinutes = (a, b) => (b - a) / 60000;
export const diffHours = (a, b) => (b - a) / 3600000;
export const diffDays = (a, b) => (b - a) / DAY;
export const diffWeeks = (a, b) => diffDays(a, b) / 7;
const floorDate = (date, unit) => new Date(Math.floor(+date / unit) * unit);
export const startOfDay = date => floorDate(date, DAY);
export const startOfHour = date => floorDate(date, 3600000);
export const startOfMinute = date => floorDate(date, 60000);
export const startOfSecond = date => floorDate(date, 1000);
export const diffWholeDays = (a, b) => timeAsMs(a) === timeAsMs(b) ? Math.round(diffDays(a, b)) : null;
export function diffWholeWeeks(a, b) {
  const days = diffWholeDays(a, b);
  return days !== null && days % 7 === 0 ? days / 7 : null;
}
export const diffDayAndTime = (a, b) => ({years: 0, months: 0, days: Math.round(diffDays(startOfDay(a), startOfDay(b))), milliseconds: timeAsMs(b) - timeAsMs(a)});

function firstWeek(year, dow, doy) {
  const anchor = arrayToUtcDate([year, 0, 7 + dow - doy]);
  return +addDays(anchor, -((anchor.getUTCDay() - dow + 7) % 7));
}
export function weekOfYear(date, dow, doy) {
  const day = +startOfDay(date), year = date.getUTCFullYear();
  let begin = firstWeek(year, dow, doy);
  if (day < begin) begin = firstWeek(year - 1, dow, doy);
  else if (day >= firstWeek(year + 1, dow, doy)) begin = firstWeek(year + 1, dow, doy);
  return Math.floor((day - begin) / (7 * DAY)) + 1;
}

const calendars = new Map();
export const registerCalendarSystem = (name, constructor) => {calendars.set(name, constructor);};
export function createCalendarSystem(name) {
  const Calendar = calendars.get(name);
  if (!Calendar) throw new RangeError(`Unknown calendar system: ${name}`);
  return new Calendar();
}
registerCalendarSystem('gregory', class {
  getMarkerYear(date) {return date.getUTCFullYear();}
  getMarkerMonth(date) {return date.getUTCMonth();}
  getMarkerDay(date) {return date.getUTCDate();}
  arrayToMarker(parts) {return arrayToUtcDate(parts);}
  markerToArray(date) {return dateToUtcArray(date);}
});

export function parseMarker(input) {
  if (typeof input !== 'string') return null;
  const text = input.trimStart(), split = text.search(/[T ]/);
  const calendar = split < 0 ? text : text.slice(0, split);
  const date = /^(\d{4})(?:-?(\d{2})(?:-?(\d{2}))?)?$/.exec(calendar);
  if (!date) return null;
  let clock, offset = null;
  if (split >= 0) {
    if (!date[3]) return null;
    clock = /^(\d{2}):?(\d{2})(?::?(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}(?::?\d{2})?)?$/.exec(text.slice(split + 1));
    if (!clock) return null;
    if (clock[5]) {
      const zone = clock[5].replace(':', '');
      offset = zone === 'Z' ? 0 : (zone[0] === '-' ? -1 : 1) * (+zone.slice(1, 3) * 60 + +(zone.slice(3) || 0));
    }
  }
  const marker = arrayToUtcDate([+date[1], +(date[2] || 1) - 1, +(date[3] || 1), +(clock?.[1] || 0), +(clock?.[2] || 0), +(clock?.[3] || 0), clock?.[4] ? +('0.' + clock[4]) * 1000 : 0]);
  return isValidDate(marker) ? {marker, isTimeUnspecified: !clock, timeZoneOffset: offset} : null;
}
export const formatDayString = marker => marker.toISOString().split('T')[0];
export const formatIsoMonthStr = marker => formatDayString(marker).slice(0, -3);
export const formatIsoTimeString = date => [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()].map(n => padStart(n, 2)).join(':');
export function formatTimeZoneOffset(minutes, iso = false) {
  const total = Math.round(Math.abs(minutes)), hours = Math.floor(total / 60), rest = total % 60, sign = minutes < 0 ? '-' : '+';
  return iso ? `${sign}${padStart(hours, 2)}:${padStart(rest, 2)}` : `GMT${sign}${hours}${rest ? ':' + padStart(rest, 2) : ''}`;
}
export function buildIsoString(marker, offset, omitTime = false) {
  const text = marker.toISOString().replace('.000Z', 'Z');
  if (omitTime && text.endsWith('T00:00:00Z')) return text.slice(0, -10);
  return text.slice(0, -1) + (offset == null ? '' : offset === 0 ? 'Z' : formatTimeZoneOffset(offset, true));
}
