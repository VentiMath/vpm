'use strict';
// Named time zones: vfull-ui-headless-calendar reads the IANA database through
// Intl; the original reads it through temporal-polyfill 1.0.1. For every zone
// the runtime knows, both DateEnvs are checked against a reference built from
// Intl's longOffset zone names, around every UTC-offset transition from 1840 to
// 2100 (instants just before, at and after each one, and the wall-clock times a
// transition skips or repeats) and at instants spread over the whole Date range.
// VPM must match the reference everywhere. Where the original differs, its
// polyfill disagrees with the runtime's time zone data; those cases are counted.
const assert = require('node:assert/strict'), path = require('node:path');

const OFFSET_RE = /GMT(?:([+-])(\d\d):(\d\d)(?::(\d\d))?)?$/;
const DAY = 86400000, HOUR = 3600000;

function reference(timeZone) {
  const format = new Intl.DateTimeFormat('en-US', {timeZone, timeZoneName: 'longOffset'});
  const offsetMs = ms => {
    // "12/31/1969, GMT-05:00": the zone name ends the formatted string.
    const name = format.format(Math.min(Math.max(Math.floor(ms / 1000) * 1000, -8.64e15), 8.64e15));
    const match = OFFSET_RE.exec(name);
    assert(match, `${timeZone}: unexpected offset name ${name}`);
    return match[1] ? (match[1] === '-' ? -1 : 1) * ((Number(match[2]) * 60 + Number(match[3])) * 60 + Number(match[4] || 0)) * 1000 : 0;
  };
  const marker = ms => ms + offsetMs(ms);
  // Temporal's 'compatible' reading of a wall-clock time: the earliest instant
  // that shows it, or for a skipped time, the time read with the offset in effect
  // before the transition. Offsets never exceed 16 hours (Manila's local mean
  // time was -15:56), so only instants within 18 hours can show the time; the
  // offsets in effect there are those at both ends and after each transition in
  // between. `transitions` is the zone's sorted list from 1840 to 2100; beyond it
  // the window's ends supply the offsets.
  const instant = (wall, transitions) => {
    const low = wall - 18 * HOUR, high = wall + 18 * HOUR;
    const inside = transitions.filter(t => t > low && t <= high);
    const offsets = new Set([offsetMs(low), offsetMs(high), ...inside.map(offsetMs)]);
    const matches = [...offsets].map(offset => wall - offset).filter(candidate => marker(candidate) === wall);
    if (matches.length) return Math.min(...matches);
    return wall - (inside.length ? offsetMs(inside[inside.length - 1] - 1000) : offsetMs(low));
  };
  return {offsetMs, marker, instant};
}

function transitionsBetween(ref, from, to, step = 7 * DAY) {
  const found = [];
  let previous = ref.offsetMs(from);
  for (let low = from; low < to; low += step) {
    const high = Math.min(low + step, to), offset = ref.offsetMs(high);
    if (offset !== previous) {
      let a = low, b = high;
      while (b - a > 1000) { const middle = a + Math.floor((b - a) / 2000) * 1000; if (ref.offsetMs(middle) === previous) a = middle; else b = middle; }
      found.push(b);
      previous = offset;
    }
  }
  return found;
}

module.exports = async function compareZones({zones = Intl.supportedValuesOf('timeZone'), log = console.log} = {}) {
  const original = await import(path.join(__dirname, 'node_modules/@full-ui/headless-calendar/index.js'));
  const vpm = await import(path.resolve(__dirname, '../../packages/vfull-ui-headless-calendar/index.js'));
  const {Temporal} = await import(path.join(__dirname, 'node_modules/temporal-polyfill/index.js'));
  const locale = {codes: ['en-US'], week: {dow: 0, doy: 1}, simpleNumberFormat: new Intl.NumberFormat('en-US'), options: {}};
  const settings = timeZone => ({timeZone, calendarSystem: 'gregory', locale, weekTextLong: 'Week'});
  const from = Date.UTC(1840, 0, 1), to = Date.UTC(2100, 0, 1);
  const spread = [];
  for (let ms = -8.64e15 + 2 * DAY; ms <= 8.64e15 - 2 * DAY; ms += (8.64e15 - 2 * DAY) / 50) spread.push(ms);
  for (let ms = Date.UTC(1600, 0, 1); ms < Date.UTC(2100, 0, 1); ms += DAY * 97.3 + 12345) spread.push(Math.round(ms));
  const totals = {transitions: 0, instants: 0, walls: 0, originalDiffers: 0};
  // Where the original differs: wrong offsets (markers, instants or offsets) by
  // zone and year, and ISO strings alone (an offset printed as ":60").
  const wrongOffsets = new Map(), wrongIso = new Set();
  for (const timeZone of zones) {
    const ref = reference(timeZone);
    const a = new original.DateEnv(settings(timeZone)), b = new vpm.DateEnv(settings(timeZone));
    const differs = year => { totals.originalDiffers++; wrongOffsets.set(timeZone, (wrongOffsets.get(timeZone) || new Set()).add(year)); };
    const checkInstant = ms => {
      const expected = ref.marker(ms);
      assert.equal(b.timestampToMarker(ms).valueOf(), expected, `${timeZone} timestampToMarker(${new Date(ms).toISOString()})`);
      if (a.timestampToMarker(ms).valueOf() !== expected) differs(new Date(ms).getUTCFullYear());
      totals.instants++;
      return new Date(expected);
    };
    const checkWall = marker => {
      if (isNaN(marker.valueOf())) return;
      const context = `${timeZone} wall ${marker.toISOString()}`;
      const instant = ref.instant(marker.valueOf(), sorted), offset = ref.offsetMs(instant) / 60000;
      assert.equal(b.toDate(marker).valueOf(), instant, context + ' toDate');
      assert.equal(b.offsetForMarker(marker), offset, context + ' offsetForMarker');
      const iso = b.formatIso(marker);
      assert.equal(iso, vpm.buildIsoString(marker, offset), context + ' formatIso');
      if (a.toDate(marker).valueOf() !== instant || a.offsetForMarker(marker) !== offset) differs(marker.getUTCFullYear());
      else if (a.formatIso(marker) !== iso) { totals.originalDiffers++; wrongIso.add(timeZone); }
      totals.walls++;
    };
    const transitions = new Set(transitionsBetween(ref, from, to));
    let zoned = Temporal.Instant.fromEpochMilliseconds(from).toZonedDateTimeISO(timeZone);
    for (;;) {
      const next = zoned.getTimeZoneTransition('next');
      if (!next || next.epochMilliseconds >= to) break;
      transitions.add(next.epochMilliseconds);
      zoned = next;
    }
    const sorted = [...transitions].sort((x, y) => x - y);
    for (const t of sorted) {
      totals.transitions++;
      for (const delta of [-25 * HOUR, -HOUR, -1000, -1, 0, 1, 999, 1000, HOUR, 25 * HOUR]) checkWall(checkInstant(t + delta));
      const before = ref.marker(t - 1) + 1, after = ref.marker(t);
      const low = Math.min(before, after), high = Math.max(before, after);
      for (const wall of [low - 1, low, low + 1, Math.floor((low + high) / 2), high - 1, high, high + 1]) checkWall(new Date(wall));
    }
    for (const ms of spread) checkWall(checkInstant(ms));
  }
  const ranges = years => {
    const sorted = [...years].sort((x, y) => x - y), out = [];
    for (const year of sorted) {
      const last = out[out.length - 1];
      if (last && year === last[1] + 1) last[1] = year; else out.push([year, year]);
    }
    return out.map(([from, to]) => from === to ? String(from) : `${from}-${to}`).join(', ');
  };
  const offsets = [...wrongOffsets].map(([zone, years]) => `${zone} (${ranges(years)})`);
  log(`Time zones match the runtime's data: ${zones.length} zones, ${totals.transitions} transitions, ${totals.instants} instants and ${totals.walls} wall-clock times (markers, offsets, instants and ISO strings). The original differs in ${totals.originalDiffers} checks: wrong offsets in ${wrongOffsets.size} zones: ${offsets.join('; ') || 'none'}; ISO offsets printed with ":60" in ${wrongIso.size}: ${[...wrongIso].join(', ') || 'none'}.`);
  return {...totals, zones: zones.length, wrongOffsets: [...wrongOffsets.keys()], wrongIso: [...wrongIso]};
};

if (require.main === module) module.exports().catch(error => { console.error(error); process.exit(1); });
