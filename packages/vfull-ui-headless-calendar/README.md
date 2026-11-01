# vfull-ui-headless-calendar

**Implementation status:** the current package retains upstream implementation
code with the changes documented below. Its tests verify that adapted build.
An independently written implementation of the application-facing APIs is
pending; this package is not yet a completed rewrite.

FullCalendar's headless date engine, targeting **@full-ui/headless-calendar
7.1.3**, the latest stable release checked November 1, 2026. It is the deepest
package under `@fullcalendar/core` 7 and `@fullcalendar/react` 7. Zero runtime
dependencies: named time zones are read through `Intl.DateTimeFormat`, so
neither `temporal-polyfill` nor a native `Temporal` is required. An ES module for
browsers, Node.js 24+ and Bun.

```js
import {DateEnv, NativeDateFormatter, joinDateTimeFormatParts} from 'vfull-ui-headless-calendar';

const locale = {codes: ['en-US'], week: {dow: 0, doy: 1}, simpleNumberFormat: new Intl.NumberFormat('en-US'), options: {}};
const env = new DateEnv({timeZone: 'America/New_York', calendarSystem: 'gregory', locale});
env.createMarker(Date.UTC(2024, 6, 4, 16)).toISOString(); // '2024-07-04T12:00:00.000Z', the wall-clock time
const marker = env.createMarker('2024-11-03T01:30:00'); // occurs twice as clocks fall back
env.toDate(marker).toISOString(); // '2024-11-03T05:30:00.000Z', the first (EDT) occurrence
env.formatIso(marker); // '2024-11-03T01:30:00-04:00'
const time = new NativeDateFormatter({hour: 'numeric', minute: '2-digit', timeZoneName: 'short'});
joinDateTimeFormatParts(env.formatToParts(marker, time)); // '1:30AM GMT-4'
```

This is 7.1.3's published module and declarations: date markers (UTC-based
`Date`s holding a wall-clock time), durations, ranges, week numbers, `DateEnv`
with its `'local'`, `'UTC'` and named time zones, and the native, function and
command formatters. Exports and declarations are unchanged. A skipped
wall-clock time moves forward by the gap and a repeated one takes its earlier
occurrence, as Temporal's `'compatible'` mode (and the original) does.

| Upstream dependency | Here |
| --- | --- |
| `temporal-polyfill` ^1.0.1 (peer) | Not needed: IANA time zones are read through `Intl.DateTimeFormat` |

## Changes from 7.1.3

- **Named time zones without a polyfill.** The original converts named zones
  through `temporal-polyfill`, which a bundle then carries: 20 modules and about
  411 KiB of source, against this package's one module of 41 KiB. Where the
  runtime has no native `Temporal` (Node.js 24, the iOS 15 WebView VentiMath's
  app supports, browsers before Temporal shipped), the polyfill finds offset
  changes by sampling every 60 days and so misses changes that come in pairs
  inside one period. Checked against Node's own time zone data from 1840 to
  2100, the original has wrong offsets in 29 zones: Casablanca for weeks in most
  years from 2018 to 2083 (Morocco suspends +01:00 for Ramadan), Fiji in
  2020-2021, Cairo in 2010 and 2014, Tomsk in 2002, five Argentine zones in 2004
  and 2007-2008, and much of Europe in the 1940s. Here each instant's offset is
  read from the runtime's data, and VPM matches it in every zone. `'local'` and
  `'UTC'` never needed either. Named-zone conversions take 66-84% less time than
  the polyfill; against a native `Temporal` (Bun), resolving wall-clock times
  takes about twice as long.
- **Years 0-99.** `Date.UTC` and the `Date` constructor read years 0-99 as
  1900-1999, so `parseMarker('0050-06-01')` returned 1950 and adding -1990 years
  to 2024 returned 1934. Those years are built 400 Gregorian years later and
  moved back.
- **Offsets never print as ":60".** Hours and minutes were rounded separately,
  so Denver's local mean time (-6:59:56, until 1883) printed as `-06:60`, and
  likewise in Anchorage, Glace Bay and Gambier. The offset is now rounded as a
  whole (`-07:00`).
- **Local-time milliseconds.** Converting a marker to a `Date` in the `'local'`
  zone dropped its milliseconds, so formatting showed `.000` while `formatIso`
  showed the real value. Both keep them now.

Instants before 1653 use a zone's earliest offset, as the polyfill does; no zone
changed offset that early. An unknown time zone name throws a `RangeError` from
`Intl`, where the original threw one from the polyfill.

## Evidence

- [Upstream suite](../../scripts/headless-calendar-conformance/README.md): the
  release's 75 vitest tests, run with its own runner, pass for VPM and for the
  original on Bun; on Node 22 both fail the same two because its ICU renders UTC
  as "GMT" instead of "GMT+0".
- [Time zones](../../scripts/headless-calendar-conformance/zones.cjs): every
  zone the runtime knows, around every offset change from 1840 to 2100 and
  across the whole `Date` range, against a reference built from the runtime's
  data. VPM matches everywhere; the checks where the original differs are listed.
- [Regressions](../../scripts/headless-calendar-conformance/regressions.cjs):
  each change above reproduced with the original, then checked here.
- [Focused tests](test/headless-calendar.test.cjs) and [type tests](test/types.ts).
- [Measurements](bench/results/README.md): named zones, the local zone and UTC
  against the polyfill (Node) and native `Temporal` (Bun).

MIT licensing, the pinned source and the changes are recorded in
[PROVENANCE.json](PROVENANCE.json).
