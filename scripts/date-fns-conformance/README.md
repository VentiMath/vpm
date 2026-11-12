# Date-fns application conformance

`vdate-fns` targets **4.4.0** and compares against the VentiMath pin **4.1.0**. The runtime is independently written; fixture dependencies are comparison controls and real callers only.

- `run.cjs`: 28,420 comparisons per time zone against both controls. Six zones cover UTC, Vancouver, Los Angeles, Berlin, Lord Howe and Kathmandu. Dates include leap/month/year boundaries, invalid dates, spring/fall transitions, ISO offsets, app formats, MUI field parsing, week rules and relative-time thresholds.
- `adapter.cjs`: 141 snapshots per zone through **unchanged MUI AdapterDateFns 8.7.0**, including every default format, month grids, year ranges and invalid field input.
- `browser.cjs`: actual MUI DateTimePicker on React **19.3.1**, with upstream/current/app controls. Checks grid contents, day selection, and real Chrome mouse/keyboard year/minute edits, with the resulting dates and accessible segmented fields compared. No production data or app writes.
- `types.cjs`: strict TypeScript 7 NodeNext ESM/CommonJS and bundler consumers, including MUI's adapter declaration. An explicit declaration path resolves MUI's extensionless transition-group type import; declarations are not skipped.
- `archives.cjs`: actual npm-packed package under both its VPM name and the `date-fns` alias; clean and frozen npm/Bun installs, every exported ESM/CommonJS entry, unchanged adapter and public types.
- Package tests assert clone/overflow behavior, explicit unsupported-format errors, deterministic relative-time clock handling and calendar versus elapsed arithmetic across the 2026 BC transition.

```sh
npm --prefix scripts/date-fns-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/date-fns-conformance/run.cjs
bun scripts/date-fns-conformance/run.cjs
node scripts/date-fns-conformance/adapter.cjs
bun scripts/date-fns-conformance/adapter.cjs
node --test packages/vdate-fns/test/dates.test.cjs
bun test packages/vdate-fns/test/dates.test.cjs
node scripts/date-fns-conformance/types.cjs
node scripts/date-fns-conformance/browser.cjs
node scripts/date-fns-conformance/archives.cjs
```

Hosts must have current timezone data; see [the timezone guard](../../docs/TIME-ZONES.md). Tests do not hard-code offsets into the runtime implementation.

The app audit uses revision `664673678be2699602121ff2ceee0189c12a7e12`. Its root `LocalizationProvider` supplies `AdapterDateFns` with `enUS`; calendar and notes use DateTimePicker. Direct date calls also occur in issues, scrumboard, notifications, messenger, mailbox, profile and dashboard templates. Private application source was read to identify APIs and format strings and is not redistributed. Other locales, date subclasses, context options and the complete date-fns API are outside the documented scope.

[Isolated benchmarks](../../packages/vdate-fns/bench/results/README.md) measure actual returned values with balanced process order and identical-source controls. Performance claims apply to those cases, not whole-page speed.
