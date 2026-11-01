'use strict';
// Process-isolated measurements against @full-ui/headless-calendar 7.1.3 on
// temporal-polyfill 1.0.1 (which uses a runtime's native Temporal when there is
// one, as on Bun). Run with TZ=America/New_York.
const assert = require('node:assert/strict'), path = require('node:path');
process.env.TZ = 'America/New_York';
const expected = require('./expected.json');
const fixture = path.resolve(__dirname, '../../../scripts/headless-calendar-conformance');

(async () => {
  const {upstream, vpm} = await require('../../../scripts/bench-library.cjs').load({upstream: () => import(path.join(fixture, 'node_modules/@full-ui/headless-calendar/index.js')), vpm: () => import(path.resolve(__dirname, '../index.js'))});
  const locale = {codes: ['en-US'], week: {dow: 0, doy: 1}, simpleNumberFormat: new Intl.NumberFormat('en-US'), options: {}};
  // A calendar's inputs: event timestamps spread over a year, the wall-clock
  // start of each day cell of a six-week month view, and ISO strings.
  const stamps = Array.from({length: 200}, (_, i) => Date.UTC(2026, 0, 1) + i * 157680000 + (i % 7) * 3600000);
  const cells = Array.from({length: 42}, (_, i) => new Date(Date.UTC(2026, 2, 1 + i)));
  const isoStrings = stamps.map(ms => new Date(ms).toISOString().replace('.000Z', ''));
  const env = {locale, stamps, cells, isoStrings};
  const prelude = 'const {locale, stamps, cells, isoStrings} = env; const make = timeZone => new lib.DateEnv({timeZone, calendarSystem: "gregory", locale, weekTextLong: "Week"});\n';
  const compiled = body => lib => new Function('lib', 'env', prelude + body)(lib, env);
  const cases = [
    {name: 'named zone / 200 timestamps to wall-clock markers', make: compiled('const e = make("America/New_York"); return () => { let s = 0; for (const ms of stamps) s += e.timestampToMarker(ms).valueOf() % 9973; return s; };'), validate: v => assert.ok(v > 0)},
    {name: 'named zone / 42 day cells to instants and offsets', make: compiled('const e = make("America/New_York"); return () => { let s = 0; for (const m of cells) s += e.toDate(m).valueOf() % 9973 + e.offsetForMarker(m); return s; };'), validate: v => assert.ok(Number.isFinite(v))},
    {name: 'named zone / format 42 day cells', make: compiled('const e = make("Europe/Berlin"), f = new lib.NativeDateFormatter({weekday: "short", day: "numeric"}); return () => { let s = 0; for (const m of cells) s += lib.joinDateTimeFormatParts(e.formatToParts(m, f)).length; return s; };'), validate: v => assert.ok(v > 42)},
    {name: 'named zone / parse 200 ISO strings', make: compiled('const e = make("Asia/Tokyo"); return () => { let s = 0; for (const t of isoStrings) s += e.createMarker(t + "Z").valueOf() % 9973; return s; };'), validate: v => assert.ok(v > 0)},
    {name: 'local zone / 42 day cells to instants', make: compiled('const e = make("local"); return () => { let s = 0; for (const m of cells) s += e.toDate(m).valueOf() % 9973; return s; };'), validate: v => assert.ok(v > 0)},
    {name: 'UTC / parse 200 ISO strings and add a month', make: compiled('const e = make("UTC"), month = lib.createDuration({months: 1}); return () => { let s = 0; for (const t of isoStrings) s += e.add(e.createMarker(t), month).valueOf() % 9973; return s; };'), validate: v => assert.ok(v > 0)},
  ];
  for (const item of cases) item.validate = value => assert.equal(value, expected[item.name], item.name);
  await require('../../../scripts/bench-process.cjs').run({root: path.resolve(__dirname, '..'), upstream, vpm, cases,
    files: ['../../scripts/bench-library.cjs', 'package.json', 'index.js', 'markers.js', 'ranges.js', 'durations.js', 'environment.js', 'formatters.js', 'zones.js', 'bench/compare.cjs', 'bench/expected.json', '../../scripts/headless-calendar-conformance/package-lock.json']});
})().catch(error => { console.error(error); process.exit(1); });
