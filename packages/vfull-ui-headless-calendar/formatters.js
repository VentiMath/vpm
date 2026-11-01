export const joinDateTimeFormatParts = parts => parts.map(part => part.value).join('');
export function expandZonedInstant(date, calendar) {
  const array = calendar.markerToArray(date.marker);
  const [year, month, day, hour, minute, second, millisecond] = array;
  return {...date, array, year, month, day, hour, minute, second, millisecond, timeZoneOffset: (date.marker - date.instantMs) / 60000};
}
export function createVerboseFormattingArg(start, end, context) {
  const date = expandZonedInstant(start, context.calendarSystem);
  return {date, start: date, end: end ? expandZonedInstant(end, context.calendarSystem) : null, timeZone: context.timeZone, localeCodes: context.locale.codes};
}
export class FuncDateFormatter {
  constructor(func) {this.func = func;}
  formatToParts(date, context) {return [{type: 'literal', value: this.func(createVerboseFormattingArg(date, null, context))}];}
  formatRangeToParts(start, end, context) {return [{type: 'literal', source: 'shared', value: this.func(createVerboseFormattingArg(start, end, context))}];}
}
export class CmdDateFormatter {
  constructor(command) {this.cmdStr = command;}
  formatToParts(date, context) {
    const value = context.cmdFormatter(this.cmdStr, createVerboseFormattingArg(date, null, context));
    return Array.isArray(value) ? value : [{type: 'literal', value}];
  }
  formatRangeToParts(start, end, context) {
    const value = context.cmdFormatter(this.cmdStr, createVerboseFormattingArg(start, end, context));
    return (Array.isArray(value) ? value : [{type: 'literal', value}]).map(part => ({source: 'shared', ...part}));
  }
}

const extensions = new Set(['week', 'meridiem', 'omitZeroMinute', 'omitCommas', 'forceCommas', 'omitTrailing', 'weekdayJustify']);
function decorate(raw, options, range) {
  const result = [];
  for (const original of raw) {
    const part = {...original};
    if (part.type === 'literal' || part.type === 'dayPeriod') {
      part.value = part.value.replaceAll('\u200e', '');
      if (options.omitCommas) part.value = part.value.replaceAll(',', '');
      if (part.type === 'dayPeriod') {
        if (result.at(-1)?.type === 'literal') result.at(-1).value = result.at(-1).value.trimEnd();
        part.value = part.value.replace(/([ap])\.?m\.?/i, (match, letter) => {
          switch (options.meridiem) {
            case false: return '';
            case 'narrow': return letter.toLowerCase();
            case 'short': return letter.toLowerCase() + 'm';
            case 'lowercase': return match.toLowerCase();
            default: return match;
          }
        });
      }
    }
    result.push(part);
  }
  if (!range && options.weekdayJustify && result.length === 3 && /^\s+$/.test(result[1].value)) {
    if (result[options.weekdayJustify === 'start' ? 2 : 0].type === 'weekday') result.reverse();
  }
  if (options.forceCommas) for (const part of result) if (part.type === 'literal' && /^\s+$/.test(part.value)) part.value = ',' + part.value;
  if (options.omitTrailing && result.at(-1)?.type === 'literal') result.at(-1).value = result.at(-1).value.replace(/[\s.,]+$/, '');
  return result.filter(part => part.value);
}
function weekParts(date, context, style) {
  const parts = [];
  if (style !== 'numeric') parts.push({type: 'literal', value: style === 'long' ? context.weekTextLong : context.weekTextShort});
  if (style === 'long' || style === 'short') parts.push({type: 'literal', value: ' '});
  parts.push({type: 'week', value: context.locale.simpleNumberFormat.format(context.computeWeekNumber(date.marker))});
  return context.locale.options.direction === 'rtl' ? parts.reverse() : parts;
}
export class NativeDateFormatter {
  constructor(options = {}) {
    this.extra = {}; this.options = {};
    for (const key of Object.keys(options)) (extensions.has(key) ? this.extra : this.options)[key] = options[key];
    const names = Object.keys(this.options);
    this.weekOnly = names.length === 0 && Boolean(this.extra.week);
    this.zoneOnly = names.length === 1 && Boolean(this.options.timeZoneName);
    if (this.options.timeZoneName) {
      this.options.timeZoneName = 'shortOffset';
      if (!this.zoneOnly) {this.options.hour ||= '2-digit'; this.options.minute ||= '2-digit';}
    }
    if (this.options.second || this.options.fractionalSecondDigits) this.extra.omitZeroMinute = false;
  }
  getFormats(context) {
    const key = JSON.stringify([context.timeZone, context.locale.codes]);
    if (key !== this.key) {
      const settings = {...this.options, timeZone: context.timeZone === 'local' ? undefined : context.timeZone};
      this.normal = new Intl.DateTimeFormat(context.locale.codes, settings);
      this.zero = undefined;
      if (this.extra.omitZeroMinute) {delete settings.minute; this.zero = new Intl.DateTimeFormat(context.locale.codes, settings);}
      this.key = key;
      this.cachedFormats = undefined;
    }
    if (!this.cachedFormats || this.cachedContext !== context) {
      this.cachedContext = context;
      this.cachedFormats = {normalFormat: this.normal, zeroFormat: this.zero};
    }
    return this.cachedFormats;
  }
  formatToParts(date, context) {
    if (this.weekOnly) return weekParts(date, context, this.extra.week);
    const {normalFormat, zeroFormat} = this.getFormats(context);
    if (this.zoneOnly) return normalFormat.formatToParts(date.instantMs).filter(part => part.type === 'timeZoneName');
    const format = zeroFormat && !date.marker.getUTCMinutes() ? zeroFormat : normalFormat;
    return decorate(format.formatToParts(date.instantMs), this.extra, false);
  }
  formatRangeToParts(start, end, context) {
    if (this.weekOnly || this.zoneOnly) return this.formatToParts(start, context).map(part => ({...part, source: part.type === 'literal' ? 'shared' : 'startRange'}));
    const {normalFormat, zeroFormat} = this.getFormats(context);
    const format = zeroFormat && !start.marker.getUTCMinutes() && !end.marker.getUTCMinutes() ? zeroFormat : normalFormat;
    return decorate(format.formatRangeToParts(start.instantMs, end.instantMs), this.extra, true);
  }
}
