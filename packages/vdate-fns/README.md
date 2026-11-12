# vdate-fns

Independent date utilities for VentiMath's date displays and MUI date/time pickers. Targets the used API of **date-fns 4.4.0**, with comparisons against the application's **4.1.0** pin. No runtime dependencies.

```js
import { addDays, format, parseISO } from 'vdate-fns';
import { enUS } from 'vdate-fns/locale/en-US';

format(addDays(parseISO('2026-11-12'), 1), 'MMM d, yyyy', { locale: enUS });
```

Root ESM/CommonJS exports and named per-function subpaths are provided. `vdate-fns/locale` and `vdate-fns/locale/en-US` export `enUS`. Replacing `date-fns` for MUI requires resolving **all** its date-fns imports to this package; changing only application imports leaves the adapter on upstream. A consumer release and application adoption are separate from source completion.

## Verified application surface

- `format`, `formatISO`, `parse`, `parseISO`, `toDate`.
- `formatDistance`, `formatDistanceStrict`, and both `ToNow` variants.
- `addDays/Weeks/Months/Years/Hours/Minutes/Seconds/Milliseconds`, `sub`.
- Get/set date, month, year, hours, minutes, seconds and milliseconds; `getDaysInMonth`, `getWeek`.
- Start/end of day, week, month and year; comparisons, same day/month/year/hour, intervals, today/yesterday/this year.
- English month/day names, ordinals, quoted literals, year/month/day/weekday tokens, hours/minutes/seconds/fractions, meridiem and localized `P`/`p` formats. Formatting additionally supports quarters, week numbers, eras, offsets and timestamps. Parsing covers the field tokens used by MUI; unsupported parsing tokens throw.

Plain JavaScript `Date` values and **en-US** are the scope. Other locales, date subclasses (`TZDate`/`UTCDate`), context options, FP entry points, the entire Unicode parsing grammar, locale matching APIs and the rest of date-fns are not implemented. Unsupported locales and tokens fail explicitly. The locale object supplies the formatting and localization interface used by this adapter, not every upstream locale hook.

Calendar days preserve the local clock across daylight-saving changes; hours advance elapsed time. Month/year addition clamps to the last valid date. ISO and picker parsing reject impossible dates instead of silently rolling them into another month. Dates are cloned before arithmetic. These semantics preserve upstream behavior, rather than claiming upstream has these bugs.

Timezone correctness depends on the host's current data. See [timezone guidance](../../docs/TIME-ZONES.md), including British Columbia's 2026 change and affected Linux Bun installations. This package does not ship a timezone database or infer a fixed offset from a location.

## Verification and performance

[Conformance fixtures](../../scripts/date-fns-conformance/README.md) compare both upstream versions across six time zones and exercise the unchanged MUI adapter, actual Chrome picker interactions, strict TypeScript declarations and packed installs. [Benchmark results](bench/results/README.md) use isolated balanced runs and identical-source controls. Results distinguish established improvements from timing noise.

Implementation provenance is recorded in [PROVENANCE.json](PROVENANCE.json). The runtime was independently written; upstream is installed only in comparison fixtures.
