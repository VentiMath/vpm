'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');

const root = path.join(__dirname, '..');
const load = () => import(path.join(root, 'index.js'));
const locale = {codes: ['en-US'], week: {dow: 0, doy: 1}, simpleNumberFormat: new Intl.NumberFormat('en-US'), options: {}};
const envFor = (H, timeZone, extra = {}) => new H.DateEnv({timeZone, calendarSystem: 'gregory', locale, weekTextLong: 'Week', ...extra});
const utc = (...args) => new Date(Date.UTC(...args));

test('ES module with upstream 7.1.3 exports and no dependencies', async () => {
  const H = await load();
  assert.deepEqual(Object.keys(H).sort(), ['CmdDateFormatter', 'DateEnv', 'FuncDateFormatter', 'NativeDateFormatter', 'addDays', 'addDurations', 'addMs', 'addWeeks',
    'arrayToLocalDate', 'arrayToUtcDate', 'asCleanDays', 'asRoughDays', 'asRoughHours', 'asRoughMinutes', 'asRoughMonths', 'asRoughMs', 'asRoughSeconds', 'asRoughYears',
    'buildIsoString', 'constrainMarkerToRange', 'createCalendarSystem', 'createDuration', 'createVerboseFormattingArg', 'dateToLocalArray', 'dateToUtcArray',
    'diffDayAndTime', 'diffDays', 'diffHours', 'diffMinutes', 'diffSeconds', 'diffWeeks', 'diffWholeDays', 'diffWholeWeeks', 'durationsEqual', 'expandZonedInstant',
    'formatDayString', 'formatIsoMonthStr', 'formatIsoTimeString', 'formatTimeZoneOffset', 'greatestDurationDenominator', 'intersectRanges', 'invertRanges', 'isInt',
    'isValidDate', 'joinDateTimeFormatParts', 'multiplyDuration', 'padStart', 'parseMarker', 'parseRange', 'rangeContainsMarker', 'rangeContainsRange', 'rangesEqual',
    'rangesIntersect', 'registerCalendarSystem', 'startOfDay', 'startOfHour', 'startOfMinute', 'startOfSecond', 'subtractDurations', 'timeAsMs', 'trimEnd', 'weekOfYear',
    'wholeDivideDurations']);
  const metadata = require('../package.json');
  assert.equal(metadata.type, 'module');
  assert.equal(metadata.dependencies, undefined);
  assert.equal(metadata.peerDependencies, undefined);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'index.js'), 'utf8'), /^\s*import\s/m);
  assert.equal(require('../index.js').DateEnv, H.DateEnv);
});

test('skipped and repeated wall-clock times resolve as Temporal\'s compatible mode does', async () => {
  const H = await load(), env = envFor(H, 'America/New_York');
  // 2024-03-10 02:30 does not exist; it moves forward by the gap to 03:30 EDT.
  assert.equal(env.toDate(utc(2024, 2, 10, 2, 30)).toISOString(), '2024-03-10T07:30:00.000Z');
  assert.equal(env.offsetForMarker(utc(2024, 2, 10, 2, 30)), -240);
  // 2024-11-03 01:30 occurs twice; the earlier (EDT) occurrence is used.
  assert.equal(env.toDate(utc(2024, 10, 3, 1, 30)).toISOString(), '2024-11-03T05:30:00.000Z');
  assert.equal(env.formatIso(utc(2024, 10, 3, 1, 30)), '2024-11-03T01:30:00-04:00');
  assert.equal(env.formatIso(utc(2024, 10, 3, 3, 0)), '2024-11-03T03:00:00-05:00');
  // Instants on either side of the transitions.
  assert.equal(env.timestampToMarker(Date.UTC(2024, 2, 10, 6, 59, 59, 999)).toISOString(), '2024-03-10T01:59:59.999Z');
  assert.equal(env.timestampToMarker(Date.UTC(2024, 2, 10, 7)).toISOString(), '2024-03-10T03:00:00.000Z');
  assert.equal(env.timestampToMarker(Date.UTC(2024, 10, 3, 6)).toISOString(), '2024-11-03T01:00:00.000Z');
  assert.equal(env.timestampToMarker(Date.UTC(2024, 10, 3, 5)).toISOString(), '2024-11-03T01:00:00.000Z');
  const range = env.toZonedInstant(utc(2024, 2, 10, 2, 30));
  assert.equal(range.marker.toISOString(), '2024-03-10T03:30:00.000Z');
  assert.equal(range.instantMs, Date.UTC(2024, 2, 10, 7, 30));
});

test('fractional, half-hour and historical offsets', async () => {
  const H = await load();
  assert.equal(envFor(H, 'Asia/Kathmandu').offsetForMarker(utc(2024, 0, 1)), 345);
  assert.equal(envFor(H, 'Pacific/Chatham').formatIso(utc(2024, 0, 1, 12)), '2024-01-01T12:00:00+13:45');
  const lordHowe = envFor(H, 'Australia/Lord_Howe');
  assert.equal(lordHowe.offsetForMarker(utc(2024, 0, 1)), 660);
  assert.equal(lordHowe.offsetForMarker(utc(2024, 6, 1)), 630);
  // New York's local mean time, -4:56:02, keeps its seconds.
  const newYork = envFor(H, 'America/New_York');
  assert.equal(newYork.offsetForMarker(utc(1880, 0, 1)), -(4 * 3600 + 56 * 60 + 2) / 60);
  assert.equal(newYork.timestampToMarker(Date.UTC(1880, 0, 1, 12)).toISOString(), '1880-01-01T07:03:58.000Z');
  assert.equal(newYork.formatIso(utc(1880, 0, 1)), '1880-01-01T00:00:00-04:56');
  // Instants before 1653 use the zone's earliest offset.
  assert.equal(newYork.offsetForMarker(H.arrayToUtcDate([1, 0, 1])), newYork.offsetForMarker(utc(1700, 0, 1)));
  assert.equal(newYork.toDate(utc(-5000, 0, 1)).valueOf(), Date.UTC(-5000, 0, 1) + (4 * 3600 + 56 * 60 + 2) * 1000);
  // Morocco suspends +01:00 for Ramadan (2020: April 19 to May 31).
  const casablanca = envFor(H, 'Africa/Casablanca');
  assert.equal(casablanca.offsetForMarker(utc(2020, 3, 18, 12)), 60);
  assert.equal(casablanca.offsetForMarker(utc(2020, 4, 17, 12)), 0);
  assert.equal(casablanca.offsetForMarker(utc(2020, 5, 1, 12)), 60);
});

test('the whole Date range converts, including zones ahead of UTC at its end', async () => {
  const H = await load();
  for (const timeZone of ['Pacific/Apia', 'Pacific/Kiritimati', 'Etc/GMT+12', 'America/Santiago']) {
    const env = envFor(H, timeZone);
    for (const ms of [8.64e15, -8.64e15, 8.64e15 - 86400000, -8.64e15 + 86400000, 0]) {
      const marker = env.timestampToMarker(ms);
      if (!H.isValidDate(marker)) continue;
      assert.equal(env.toDate(marker).valueOf(), ms, `${timeZone} ${ms}`);
    }
  }
  assert.equal(envFor(H, 'Pacific/Apia').toDate(new Date(Date.parse('+275760-09-11T13:00:00Z'))).valueOf(), 8639999827200000);
});

test('years 0-99 are not read as 1900-1999', async () => {
  const H = await load(), env = envFor(H, 'UTC');
  assert.equal(H.parseMarker('0050-06-01').marker.toISOString(), '0050-06-01T00:00:00.000Z');
  assert.equal(H.parseMarker('0000-02-29T12:00:00Z').marker.toISOString(), '0000-02-29T12:00:00.000Z');
  assert.equal(H.arrayToUtcDate([99]).toISOString(), '0099-01-01T00:00:00.000Z');
  assert.equal(H.arrayToUtcDate([0, 1, 29, 25]).toISOString(), '0000-03-01T01:00:00.000Z');
  assert.equal(H.arrayToUtcDate([100, -1, 1]).toISOString(), '0099-12-01T00:00:00.000Z');
  assert.equal(H.arrayToUtcDate([1999, 11, 31]).toISOString(), '1999-12-31T00:00:00.000Z');
  assert.equal(env.addYears(utc(2024, 0, 1), -1990).toISOString(), '0034-01-01T00:00:00.000Z');
  assert.equal(env.add(H.parseMarker('0010-01-31').marker, H.createDuration({months: 1})).toISOString(), '0010-03-03T00:00:00.000Z');
  assert.equal(env.startOfYear(H.parseMarker('0099-12-31').marker).toISOString(), '0099-01-01T00:00:00.000Z');
  assert.equal(H.arrayToLocalDate([50, 0, 1]).getFullYear(), 50);
  assert.equal(H.arrayToLocalDate([50, 0, 1, 25]).getDate(), 2);
  assert(Number.isNaN(H.arrayToUtcDate([NaN, 0]).valueOf()));
  const named = envFor(H, 'Europe/London');
  assert.equal(named.formatIso(H.parseMarker('0050-06-01T12:00:00').marker), '0050-06-01T12:00:00-00:01');
});

test('offsets round as a whole, never to ":60"', async () => {
  const H = await load();
  assert.equal(H.formatTimeZoneOffset(-419.9333, true), '-07:00');
  assert.equal(H.formatTimeZoneOffset(59.6), 'GMT+1');
  assert.equal(H.formatTimeZoneOffset(-296.0333, true), '-04:56');
  assert.equal(H.formatTimeZoneOffset(330), 'GMT+5:30');
  assert.equal(H.formatTimeZoneOffset(0, true), '+00:00');
  assert.equal(envFor(H, 'America/Denver').formatIso(utc(1880, 0, 1)), '1880-01-01T00:00:00-07:00');
});

test('the local zone keeps milliseconds', async () => {
  const H = await load(), env = envFor(H, 'local');
  const marker = env.createMarker(Date.UTC(2024, 5, 1, 12, 0, 0, 750));
  assert.equal(env.toDate(marker).valueOf(), Date.UTC(2024, 5, 1, 12, 0, 0, 750));
  assert.equal(env.toZonedInstant(marker).instantMs, Date.UTC(2024, 5, 1, 12, 0, 0, 750));
  const formatter = new H.NativeDateFormatter({second: '2-digit', fractionalSecondDigits: 3});
  assert.match(H.joinDateTimeFormatParts(env.formatToParts(marker, formatter)), /\.750$/);
  assert.equal(H.arrayToLocalDate([2024, 5, 1, 12, 0, 0, 750]).getMilliseconds(), 750);
});

test('named zones format through Intl and reject unknown names', async () => {
  const H = await load(), env = envFor(H, 'Asia/Tokyo');
  const marker = env.createMarker('2024-06-01T09:00:00Z');
  assert.equal(marker.toISOString(), '2024-06-01T18:00:00.000Z');
  const formatter = new H.NativeDateFormatter({hour: 'numeric', minute: '2-digit', timeZoneName: 'short'});
  assert.equal(H.joinDateTimeFormatParts(env.formatToParts(marker, formatter)), '6:00PM GMT+9');
  assert.throws(() => envFor(H, 'Not/A_Zone').timestampToMarker(0), RangeError);
  assert.equal(envFor(H, 'utc').timestampToMarker(0).valueOf(), 0);
});
