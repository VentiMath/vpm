const units = ['years', 'months', 'days', 'milliseconds'];
const empty = () => ({years: 0, months: 0, days: 0, milliseconds: 0});
export function createDuration(input, unit = 'milliseconds') {
  if (typeof input === 'string') {
    // Consume the whole input; a valid prefix must not hide an invalid suffix.
    const match = /^(-?)(?:(\d+)\.)?(\d+):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?$/.exec(input);
    if (!match) return null;
    const sign = match[1] ? -1 : 1;
    return {years: 0, months: 0, days: sign * +(match[2] || 0), milliseconds: sign * (+match[3] * 3600000 + +match[4] * 60000 + +(match[5] || 0) * 1000 + +(match[6] || 0))};
  }
  if (typeof input === 'number') input = {[unit]: input};
  if (!input || typeof input !== 'object') return null;
  const value = (plural, singular) => input[plural] || input[singular] || 0;
  const result = empty();
  result.years = value('years', 'year'); result.months = value('months', 'month'); result.days = value('days', 'day');
  result.milliseconds = value('hours', 'hour') * 3600000 + value('minutes', 'minute') * 60000 + value('seconds', 'second') * 1000 + (input.milliseconds || input.millisecond || input.ms || 0);
  const weeks = value('weeks', 'week');
  if (weeks) {result.days += weeks * 7; result.specifiedWeeks = true;}
  return units.every(key => Number.isFinite(result[key])) ? result : null;
}
export const durationsEqual = (a, b) => units.every(key => a[key] === b[key]);
export const asCleanDays = d => d.years || d.months || d.milliseconds ? 0 : d.days;
const zip = (a, b, sign) => ({years: a.years + sign * b.years, months: a.months + sign * b.months, days: a.days + sign * b.days, milliseconds: a.milliseconds + sign * b.milliseconds});
export const addDurations = (a, b) => zip(a, b, 1);
export const subtractDurations = (a, b) => zip(a, b, -1);
export const multiplyDuration = (d, n) => ({years: d.years * n, months: d.months * n, days: d.days * n, milliseconds: d.milliseconds * n});
export const asRoughMs = d => d.years * 365 * 86400000 + d.months * 30 * 86400000 + d.days * 86400000 + d.milliseconds;
export const asRoughSeconds = d => asRoughMs(d) / 1000;
export const asRoughMinutes = d => asRoughMs(d) / 60000;
export const asRoughHours = d => asRoughMs(d) / 3600000;
export const asRoughDays = d => asRoughMs(d) / 86400000;
export const asRoughMonths = d => asRoughDays(d) / 30;
export const asRoughYears = d => asRoughDays(d) / 365;
export function wholeDivideDurations(numerator, denominator) {
  let ratio = null;
  for (const key of units) {
    if (!denominator[key]) {if (numerator[key]) return null; continue;}
    const current = numerator[key] / denominator[key];
    if (!Number.isInteger(current) || (ratio !== null && current !== ratio)) return null;
    ratio = current;
  }
  return ratio;
}
export function greatestDurationDenominator(d) {
  if (d.milliseconds) {
    for (const [unit, divisor, next] of [['millisecond', 1, 1000], ['second', 1000, 60000], ['minute', 60000, 3600000], ['hour', 3600000, Infinity]]) {
      if (d.milliseconds % next) return {unit, value: d.milliseconds / divisor};
    }
  }
  if (d.days && d.specifiedWeeks && d.days % 7 === 0) return {unit: 'week', value: d.days / 7};
  for (const unit of ['day', 'month', 'year']) if (d[unit + 's']) return {unit, value: d[unit + 's']};
  return {unit: 'millisecond', value: 0};
}
