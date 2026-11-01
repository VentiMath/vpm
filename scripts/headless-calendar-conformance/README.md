# Headless calendar conformance

Baseline: **@full-ui/headless-calendar 7.1.3**, the npm tarball recorded in the
package [provenance](../../packages/vfull-ui-headless-calendar/PROVENANCE.json),
checked November 1, 2026. The release's vitest suite (`tests`), its vitest
configuration and the repository license from the `v7.1.3` tag (commit
`6b890e803c66d1e6db2fb21c449936155b7e81fc`) are retained under `upstream/`
(TypeScript files use a `.txt` suffix to avoid root test discovery) and verified
against `SHA256.json` before execution. The fixture pins the original package,
its `temporal-polyfill` peer at 1.0.1 and vitest at 4.0.18, the versions in the
release's lockfile.

```sh
npm --prefix scripts/headless-calendar-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/headless-calendar-conformance/run.cjs --upstream
node scripts/headless-calendar-conformance/run.cjs
node scripts/headless-calendar-conformance/arithmetic.cjs
node scripts/headless-calendar-conformance/regressions.cjs
node scripts/headless-calendar-conformance/zones.cjs
```

Repeat with Bun.

`run.cjs` runs the release's 75 tests with its own runner and configuration. The
tests import the package's TypeScript modules from `../src`; each becomes a
re-export of the published entry under test, the original's or VPM's. All 75
pass for both libraries on Node 24 and Bun. Some older ICU versions render UTC's short offset as
"GMT" where the tests expect "GMT+0", as current ICU renders it, so on such a
runtime both libraries fail exactly those two tests; `run.cjs` requires that set
only where the runtime renders "GMT".

`regressions.cjs` runs each library in a fresh process and reproduces each
defect fixed here with the original: Casablanca's offset during Morocco's
Ramadan suspensions of +01:00, which temporal-polyfill's own transition search
misses (on Bun, whose native Temporal the polyfill defers to, the original is
correct); years 0-99 read as 1900-1999; Denver's local mean time printed as
"-06:60"; and milliseconds dropped in the local time zone. It also counts the
modules a bundle loads for named time zones.

`zones.cjs` checks named time zones against a reference built from the
runtime's own data: each instant's offset is read from Intl's `longOffset` zone
name, and wall-clock times are resolved from those offsets as Temporal's
'compatible' mode does. For every zone the runtime knows, it finds each offset
transition from 1840 to 2100 (by a weekly scan with bisection, together with
temporal-polyfill's list) and checks instants around each transition, the
wall-clock times it skips or repeats, and instants across the whole Date range.
VPM's markers, offsets, instants and ISO strings must match the reference
everywhere. The checks where the original differs are counted and listed by zone
and year.

The runtime under test is now independently implemented. `arithmetic.cjs` adds
107,500 deterministic comparisons of valid dates, week numbers, durations,
ranges and parsing per runtime. Focused tests explicitly cover the deliberate
differences: complete duration parsing, finite units, clipped/nonmutating range
inversion, epoch-zero ranges, mutable formatting contexts and extended years.
The FullCalendar React fixture also runs its mounted and browser suites with
this engine, so the callers exercise the rewrite.
