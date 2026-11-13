# Moment countdown checks

Pinned controls are current Moment 2.31.0 and the app's 2.30.1. The implementation
was written independently from the public contract, not copied from either
runtime. `run.cjs` compares calendar additions, invalid dates, explicit offsets,
DST day/second differences, fractional calendar versus elapsed duration fields,
signed zero, large finite values and the countdown tick used
by FuseCountdown. Run in UTC, America/Los_Angeles and Europe/Berlin on Node 24
and Bun 1.4.4. The fixed app source revision and scope are in
[provenance](../../packages/vmoment/PROVENANCE.json).

```sh
npm --prefix scripts/moment-conformance ci --ignore-scripts --no-audit --no-fund
TZ=America/Los_Angeles node scripts/moment-conformance/run.cjs
TZ=Europe/Berlin bun scripts/moment-conformance/run.cjs
node --test packages/vmoment/test/countdown.test.cjs
bun test packages/vmoment/test/countdown.test.cjs
node scripts/moment-conformance/types.cjs
node scripts/moment-conformance/archives.cjs
```

TS7 checks NodeNext ESM/CommonJS and Bundler imports, including the caller's type
subpath. Archive checks pack the exact package, install it into fresh npm and Bun
consumers, repeat frozen installs, and exercise exports, declarations, unit and
control comparisons on both runtimes. No network, React rendering or browser
layout occurs in the runtime; this suite checks date semantics, not a deployed
VentiMath page. [Benchmarks](../../packages/vmoment/bench/results/README.md) measure
only the documented operations, not all of Moment.
