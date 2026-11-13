# vmoment

Independent date and duration implementation for VentiMath's `FuseCountdown`,
matching Moment 2.31.0 and the caller's 2.30.1 within the scope below. Zero runtime
dependencies. The caller is used on five coming-soon template pages; contest
paper timers do not use it. Built and tested; release and app adoption are pending.

```js
import moment from "vmoment";
const end = moment().add(15, "days");
const remaining = moment.duration(end.diff(moment(), "seconds"), "seconds");
console.log(remaining.hours(), remaining.minutes(), remaining.seconds());
```

Inputs are strict ISO calendar dates or timestamps, epoch milliseconds, `Date`,
and Moment objects. Date-only and unzoned ISO inputs use local time. Explicit
numeric offsets identify exact instants. Invalid inputs stay invalid; ambiguous
strings do not fall through to the host parser. This deliberately excludes
Moment's broad legacy parsing and format-string signatures.

`add` mutates and returns its receiver. Days/weeks use local calendar arithmetic;
smaller units use elapsed milliseconds. `diff` supports fixed units and truncates
toward zero unless its third argument is true. Day/week differences account for
DST offsets. `clone` and `toDate` make independent copies. `isValid`, `valueOf`,
`toISOString`, `toJSON`, `isMoment` and the replaceable `moment.now` clock are
available. Instances retain Moment's public marker for gradual caller migration.

`duration(number, unit)` supports milliseconds, seconds, minutes, hours, days,
and weeks, including their usual plural/short unit names. `asMilliseconds` through
`asWeeks` return totals; `milliseconds`, `seconds`, `minutes`, and `hours` return
signed component fields. Day/week inputs retain calendar components: `duration(1.5, "days")` totals 36 hours but has an hour component of zero, while `duration(36, "hours")` has an hour component of 12. This distinction matches Moment. Calendar month/year arithmetic, formatting/locales,
UTC/timezone modes, arrays/object inputs, duration objects and plugins are not
implemented. Unsupported units throw. This is an application-scoped replacement,
not a claim to the entire Moment API.

Both ESM and CommonJS are supported on Node 24 and Bun 1.4.4. Types include the
`vmoment/moment` subpath used by the caller's `Moment` type import.

[Provenance](PROVENANCE.json), [checks](../../scripts/moment-conformance/README.md)
and [isolated measurements](bench/results/README.md).

## Timezone changes

[Calendar-day and runtime timezone checks](../../docs/TIME-ZONES.md) cover BC’s
2026 change, historical DST, exact event instants and runtime data requirements.
The current implementation passes; timezone rules remain supplied by the runtime
or scheduling service rather than a fixed provincial offset.
