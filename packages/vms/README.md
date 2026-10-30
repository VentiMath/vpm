# vms

Parse duration strings and format milliseconds. Zero runtime dependencies, with
bundled TypeScript declarations and CommonJS/ES module imports. A counterpart to
`ms` 2.1.3 for Node.js 24+ and Bun.

## Use

```js
const ms = require('vms');

ms('2 hours');              // 7200000
ms('-1.5s');                // -1500
ms(1500);                  // '2s'
ms(-1500, { long: true });  // '-2 seconds'
ms('unknown');             // undefined
```

ES modules can use `import ms from 'vms'`.

## API and compatibility

`ms(string)` parses the upstream duration syntax, returning milliseconds or
`undefined` for an unrecognized nonempty string. An optional minus sign, decimal
fraction, and spaces between the number and unit are supported. Units are
case-insensitive:

| Unit | Accepted names |
| --- | --- |
| Millisecond | ms, msec, msecs, millisecond, milliseconds |
| Second | s, sec, secs, second, seconds |
| Minute | m, min, mins, minute, minutes |
| Hour | h, hr, hrs, hour, hours |
| Day | d, day, days |
| Week | w, week, weeks |
| Year | y, yr, yrs, year, years |

A missing unit means milliseconds. A year remains 365.25 days and a week seven
days. The upstream 100-character limit is preserved. Leading whitespace,
exponents, a plus sign, compound durations, and trailing whitespace after a unit
are not accepted. Trailing spaces after a bare number remain supported.

`ms(number, { long?: boolean })` formats a finite number using days, hours,
minutes, seconds, or milliseconds. Unit selection uses the unrounded magnitude,
matching upstream. Long output spells out units; short output uses suffixes.

Empty strings, non-finite numbers, and other input types throw a stable
`TypeError`. Invalid values are not serialized or coerced to construct an error.
This intentionally changes upstream's error class/message and avoids invoking
`toJSON()` or failing while serializing circular objects and BigInts.

## Corrections and validation

Negative half-unit values round symmetrically with positive values. Pluralization
follows the rounded magnitude:

| Input | ms 2.1.3 | vms |
| --- | --- | --- |
| `ms(-1500)` | `'-1s'` | `'-2s'` |
| `ms(-1500, { long: true })` | `'-1 seconds'` | `'-2 seconds'` |
| `ms(-90000, { long: true })` | `'-1 minutes'` | `'-2 minutes'` |

Positive formatting and ordinary parsing stay compatible. Negative rounding
differences are deliberate; this is a human-readable formatter, not an exact
serialization of numeric durations. Declarations distinguish parsing's possible
`undefined` result from formatting's string result.

Tests cover every unit alias, case variants, fractions, length limits, invalid
inputs, coercion hooks, rounding boundaries, and 3,000 generated comparisons.
The unchanged upstream fixture is excluded from archives. The repository's [integration gate](../../scripts/integration.cjs) aliases this package into ventimath's pinned Cloud Functions upgrade target (Functions Framework 5.0.2, firebase-functions 7.4.0, Express 5.3.0, send 1.2.1, serve-static 2.2.1) and runs real HTTP checks on Node and Bun in CI. It covers `send` and `serve-static` cache ages given as duration strings and
`jsonwebtoken` expiry durations.

## Performance

From the repository root:

```sh
node packages/vms/bench/compare.cjs
bun packages/vms/bench/compare.cjs
```

One local run on October 26, 2026. Cells are **ms / vms**, median nanoseconds per
call across seven samples of 50,000 calls after warmup. The benchmark covers
equivalent ordinary inputs, varies 32 inputs per case, consumes results, and
alternates implementation order. Corrected error and rounding cases are tested
separately. Lower is better.

| Workload | Node 24.22.1 | Bun 1.4.0 |
| --- | ---: | ---: |
| Parse compact duration | 157 / 132 | 102 / 95 |
| Parse words | 139 / 118 | 124 / 119 |
| Parse bare number | 128 / 102 | 100 / 98 |
| Format milliseconds | 23 / 20 | 32 / 21 |
| Format short | 34 / 28 | 34 / 28 |
| Format long | 48 / 48 | 35 / 33 |

Parsing was about 15–20% faster on Node in this run, with smaller gains on Bun.
Formatting was similar or faster in these cases. The parser uses the validated
unit's initial letter to select its scale instead of constructing an alias table.
No startup, memory, or application-level speedup has been measured; timings vary
across runs and runtimes.

## Install from this repository

Run `bun pm pack` in `packages/vms`, then in a consuming project:

```sh
bun add /absolute/path/to/vpm/packages/vms/vms-0.1.0.tgz
```

This package has not been published by VPM to a registry.

## Origin and license

Derived from [`ms` 2.1.3](https://github.com/vercel/ms/tree/1c6264b795492e8fdecbc82cb8802fcfbfc08d26),
Copyright (c) 2020 Vercel, Inc. The test fixture is verified against that commit.
MIT licensed; upstream notices are preserved in [LICENSE](LICENSE).
