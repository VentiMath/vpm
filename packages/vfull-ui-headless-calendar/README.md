# vfull-ui-headless-calendar

An independently written date engine for FullCalendar's application-facing
APIs, targeting **@full-ui/headless-calendar 7.1.3**. It supports Gregorian
calendar arithmetic, durations, visible ranges, week numbers and formatting
in local, UTC and named IANA time zones. It has no runtime dependencies and
runs in browsers, Node 24 and Bun.

The runtime is split into marker, duration, range, environment and formatting
modules. The earlier independent VPM `Intl.DateTimeFormat` time-zone layer is
retained. Public declarations remain derived from the upstream contracts, with
corrected nullability; upstream implementation code is no longer the runtime.

```js
import {DateEnv, NativeDateFormatter, joinDateTimeFormatParts} from 'vfull-ui-headless-calendar';

const locale = {codes: ['en-US'], week: {dow: 0, doy: 1}, simpleNumberFormat: new Intl.NumberFormat('en-US'), options: {}};
const env = new DateEnv({timeZone: 'America/New_York', calendarSystem: 'gregory', locale});
const marker = env.createMarker('2024-11-03T01:30:00');
env.toDate(marker).toISOString(); // '2024-11-03T05:30:00.000Z', the earlier occurrence
const time = new NativeDateFormatter({hour: 'numeric', minute: '2-digit'});
joinDateTimeFormatParts(env.formatToParts(marker, time)); // '1:30AM'
```

## Behavior and differences

All upstream named runtime exports remain available. Markers are UTC-based
`Date` values holding wall-clock fields. The environment converts markers to
real instants at the time-zone boundary. Native, function and command formatting
remain supported. A skipped wall-clock time moves forward by the gap; a repeated
one uses its earlier occurrence, matching Temporal's `compatible` behavior.

- IANA offsets come directly from `Intl`, without `temporal-polyfill`. This
  preserves the prior correction for offset changes the polyfill misses, such
  as Morocco's Ramadan transitions. VentiMath's local calendar does not require
  named-zone conversion.
- Years 0–99 retain their year. Local conversions retain milliseconds, and
  offset rounding cannot produce a `:60` minute field.
- Duration strings must be fully consumed. Trailing junk and nonfinite units
  return `null`; valid finite duration objects retain upstream arithmetic.
- Inverting event ranges clips them to the visible constraint and preserves
  the input array's order. Epoch zero is a valid parsed range boundary.
- A reused formatter observes changes to the context's time zone or locale.
  Extended-year month strings and padding beyond three zeroes work.
- Invalid marker/range parses and nonintegral duration divisions have nullable
  declaration results matching the runtime.

Instants before 1653 use the zone's earliest offset. Unknown IANA zones throw
`RangeError`. Calendar output still depends on the host's ICU/time-zone data;
this package does not ship its own database.

## Evidence

- The [75 upstream formatting tests](../../scripts/headless-calendar-conformance/README.md)
  pass on Node 24 and Bun.
- [107,500 deterministic comparisons](../../scripts/headless-calendar-conformance/arithmetic.cjs)
  per runtime cover arithmetic, week numbers, durations, ranges and valid parses.
- [Focused tests](test/headless-calendar.test.cjs) and
  [rewrite regressions](test/independent-engine.test.cjs) cover DST boundaries,
  Date limits and the deliberate changes above.
- The [time-zone sweep](../../scripts/headless-calendar-conformance/zones.cjs)
  checks the runtime's zones and transitions against an independent reference.
- The [calendar caller fixture](../../scripts/fullcalendar-react-conformance/README.md)
  exercises mounted components and browser interactions with this engine.
- [Isolated measurements](bench/results/README.md) report Node 24 and Bun costs,
  controls and inconclusive results. Earlier same-process claims are superseded.

The recorded Node 24 named-zone cases take 59–80% less CPU time than the
polyfill. Bun's native Temporal comparison is mixed: converting timestamps
and parsing named-zone inputs improve, while resolving paired instants/offsets
costs about 10% more and named-zone formatting about 7% more. Local conversion
costs about 5% more on Node; Bun local conversion and both UTC parsing/month
addition comparisons are inconclusive. The report retains those regressions
and all controls. The conversion cache holds only the last marker/zone pair
and observes mutations to either.

[PROVENANCE.json](PROVENANCE.json) records the source references and retained
contracts. MIT attribution is preserved. This implementation was informed by
upstream behavior, source inspection and tests; it is not a clean-room claim.
