import * as dates from './markers.js';
import * as durations from './durations.js';
import {getZoneOffsetSec, zonedWallToEpoch} from './zones.js';

// Calendar arithmetic operates on markers; conversion to real instants is
// confined to the time-zone methods and the formatting boundary.
export class DateEnv {
  constructor(options) {
    this.timeZone = options.timeZone;
    this.calendarSystem = dates.createCalendarSystem(options.calendarSystem);
    this.locale = options.locale;
    const iso = options.weekNumberCalculation === 'ISO';
    this.weekDow = typeof options.firstDay === 'number' ? options.firstDay : iso ? 1 : options.locale.week.dow;
    this.weekDoy = iso ? 4 : options.locale.week.doy;
    if (typeof options.weekNumberCalculation === 'function') this.weekNumberFunc = options.weekNumberCalculation;
    this.weekTextLong = options.weekTextLong;
    this.weekTextShort = options.weekTextShort ?? options.weekTextLong;
    this.cmdFormatter = options.cmdFormatter;
  }
  createMarker(input) {return this.createMarkerMeta(input)?.marker ?? null;}
  createNowMarker() {return this.timestampToMarker(Date.now());}
  createMarkerMeta(input) {
    if (typeof input === 'string') return this.parse(input);
    if (Array.isArray(input)) {
      const marker = dates.arrayToUtcDate(input);
      return dates.isValidDate(marker) ? {marker, isTimeUnspecified: false, instantMs: undefined} : null;
    }
    const instantMs = input instanceof Date ? +input : input;
    if (typeof instantMs !== 'number' || !Number.isFinite(instantMs) || Math.abs(instantMs) > 864e13) return null;
    const marker = this.timestampToMarker(instantMs);
    return dates.isValidDate(marker) ? {marker, instantMs, isTimeUnspecified: false} : null;
  }
  parse(text) {
    const parsed = dates.parseMarker(text);
    if (!parsed) return null;
    const instantMs = parsed.timeZoneOffset == null ? undefined : +parsed.marker - parsed.timeZoneOffset * 60000;
    return {marker: instantMs === undefined ? parsed.marker : this.timestampToMarker(instantMs), instantMs, isTimeUnspecified: parsed.isTimeUnspecified};
  }
  getYear(date) {return this.calendarSystem.getMarkerYear(date);}
  getMonth(date) {return this.calendarSystem.getMarkerMonth(date);}
  getDay(date) {return this.calendarSystem.getMarkerDay(date);}
  shift(date, years = 0, months = 0, days = 0, milliseconds = 0) {
    const parts = this.calendarSystem.markerToArray(date);
    parts[0] += years; parts[1] += months; parts[2] += days; parts[6] += milliseconds;
    return this.calendarSystem.arrayToMarker(parts);
  }
  add(date, d) {return this.shift(date, d.years, d.months, d.days, d.milliseconds);}
  subtract(date, d) {return this.shift(date, -d.years, -d.months, -d.days, -d.milliseconds);}
  addYears(date, years) {return this.shift(date, years);}
  addMonths(date, months) {return this.shift(date, 0, months);}
  diffWholeMonths(a, b) {
    return dates.timeAsMs(a) === dates.timeAsMs(b) && this.getDay(a) === this.getDay(b)
      ? (this.getYear(b) - this.getYear(a)) * 12 + this.getMonth(b) - this.getMonth(a) : null;
  }
  diffWholeYears(a, b) {
    const months = this.diffWholeMonths(a, b);
    return months !== null && this.getMonth(a) === this.getMonth(b) ? months / 12 : null;
  }
  greatestWholeUnit(a, b) {
    const candidates = [['year', () => this.diffWholeYears(a, b)], ['month', () => this.diffWholeMonths(a, b)],
      ['week', () => dates.diffWholeWeeks(a, b)], ['day', () => dates.diffWholeDays(a, b)],
      ['hour', () => dates.diffHours(a, b)], ['minute', () => dates.diffMinutes(a, b)], ['second', () => dates.diffSeconds(a, b)]];
    for (const [unit, read] of candidates) {
      const value = read(); if (value !== null && Number.isInteger(value)) return {unit, value};
    }
    return {unit: 'millisecond', value: b - a};
  }
  countDurationsBetween(a, b, duration) {
    for (const [key, diff, rough] of [
      ['years', () => this.diffWholeYears(a, b), durations.asRoughYears],
      ['months', () => this.diffWholeMonths(a, b), durations.asRoughMonths],
      ['days', () => dates.diffWholeDays(a, b), durations.asRoughDays],
    ]) {
      if (duration[key]) {const whole = diff(); if (whole !== null) return whole / rough(duration);}
    }
    return (b - a) / durations.asRoughMs(duration);
  }
  startOf(date, unit) {
    switch (unit) {
      case 'year': return this.startOfYear(date);
      case 'month': return this.startOfMonth(date);
      case 'week': return this.startOfWeek(date);
      case 'day': return dates.startOfDay(date);
      case 'hour': return dates.startOfHour(date);
      case 'minute': return dates.startOfMinute(date);
      case 'second': return dates.startOfSecond(date);
      default: return null;
    }
  }
  startOfYear(date) {return this.calendarSystem.arrayToMarker([this.getYear(date)]);}
  startOfMonth(date) {return this.calendarSystem.arrayToMarker([this.getYear(date), this.getMonth(date)]);}
  startOfWeek(date) {return dates.addDays(dates.startOfDay(date), -((date.getUTCDay() - this.weekDow + 7) % 7));}
  computeWeekNumber(marker) {return this.weekNumberFunc ? this.weekNumberFunc(this.toDate(marker)) : dates.weekOfYear(marker, this.weekDow, this.weekDoy);}
  toZonedInstant(marker, instantMs) {instantMs ??= +this.toDate(marker); return {marker: this.timestampToMarker(instantMs), instantMs};}
  formatToParts(marker, formatter, options = {}) {return formatter.formatToParts(this.toZonedInstant(marker, options.instantMs), this);}
  formatRangeToParts(start, end, formatter, options = {}) {
    const exclusive = options.isEndExclusive ? 1 : 0;
    const endInstant = options.endInstantMs == null ? undefined : options.endInstantMs - exclusive;
    return formatter.formatRangeToParts(this.toZonedInstant(start, options.startInstantMs), this.toZonedInstant(dates.addMs(end, -exclusive), endInstant), this);
  }
  formatIso(marker, options = {}) {return dates.buildIsoString(marker, options.omitTimeZoneOffset ? null : this.offsetForMarker(marker), options.omitTime);}
  timestampToMarker(ms) {
    if (this.timeZone === 'UTC') return new Date(ms);
    if (this.timeZone === 'local') return dates.arrayToUtcDate(dates.dateToLocalArray(new Date(ms)));
    return new Date(ms + getZoneOffsetSec(this.timeZone, Math.floor(ms / 1000)) * 1000);
  }
  wallConversion(marker) {
    const value = +marker;
    if (this.wallCache?.value !== value || this.wallCache.zone !== this.timeZone) {
      this.wallCache = {value, zone: this.timeZone, result: zonedWallToEpoch(this.timeZone, marker)};
    }
    return this.wallCache.result;
  }
  offsetForMarker(marker) {
    if (this.timeZone === 'UTC') return 0;
    if (this.timeZone === 'local') return -this.toDate(marker).getTimezoneOffset();
    return this.wallConversion(marker).offsetSec / 60;
  }
  toDate(marker) {
    if (this.timeZone === 'UTC') return new Date(+marker);
    if (this.timeZone === 'local') return dates.arrayToLocalDate(dates.dateToUtcArray(marker));
    return new Date(this.wallConversion(marker).epochMs);
  }
}
