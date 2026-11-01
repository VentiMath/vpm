# vfull-ui-headless-calendar measurements

Recorded November 1, 2026 on a shared Linux x64 VM (Intel Xeon @ 2.80 GHz) with
Node 22.22.0 and Bun 1.4.4, against @full-ui/headless-calendar 7.1.3 on
temporal-polyfill 1.0.1, with `TZ=America/New_York`. Node 24 was not available
on this machine. Three fresh processes per runtime, 12 alternating paired rounds
per case, 150 ms warmup per variant plus four full warmup blocks. Iterations use
a 15 ms upstream pilot target capped at 100,000. Outputs are retained and
validated outside timing. One additional process per runtime compares identical
upstream implementations. No trimming.

Each variant runs freshly compiled case code with its own measurement loop. The
second process on each runtime sets up VPM first; the others set up upstream
first. Values are pooled median nanoseconds per operation (one operation is the
whole batch named in the case). Changes are medians of paired sample ratios.
Negative means less time. Controls show identical-upstream drift. Inputs are
defined in [the benchmark](../compare.cjs).

The original's named time zones run on temporal-polyfill's own implementation
on Node, and on Bun's native `Temporal`, which the polyfill uses when a runtime
has one.

## Node 22

| Case | Upstream ns | VPM ns | Paired change | Per-process changes (2nd: VPM first) | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| named zone / 200 timestamps to wall-clock markers | 3,042,095 | 460,661 | -84.1% | -83.4%, -83.2%, -85.2% | -0.4% |
| named zone / 42 day cells to instants and offsets | 1,136,807 | 383,565 | -66.0% | -66.6%, -66.5%, -65.4% | -2.7% |
| named zone / format 42 day cells | 1,241,585 | 387,241 | -69.0% | -70.6%, -69.1%, -68.4% | -7.0% |
| named zone / parse 200 ISO strings | 3,075,490 | 727,398 | -76.4% | -74.7%, -77.3%, -76.6% | +7.3% |
| local zone / 42 day cells to instants | 13,844 | 14,241 | +2.3% | +2.6%, +1.3%, +3.4% | +0.1% |
| UTC / parse 200 ISO strings and add a month | 197,360 | 198,017 | +0.3% | -1.2%, +0.2%, +6.2% | -0.8% |

## Bun 1.4.4

| Case | Upstream ns | VPM ns | Paired change | Per-process changes (2nd: VPM first) | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| named zone / 200 timestamps to wall-clock markers | 773,079 | 430,334 | -43.7% | -46.9%, -42.8%, -46.3% | -1.7% |
| named zone / 42 day cells to instants and offsets | 191,402 | 357,745 | +88.8% | +87.5%, +91.5%, +88.0% | -2.2% |
| named zone / format 42 day cells | 352,505 | 366,630 | +1.1% | +1.4%, +1.8%, -3.6% | -2.2% |
| named zone / parse 200 ISO strings | 1,023,616 | 665,467 | -32.4% | -34.1%, -30.4%, -37.2% | +3.8% |
| local zone / 42 day cells to instants | 8,152 | 8,520 | +5.6% | +7.4%, +7.5%, +0.8% | -1.2% |
| UTC / parse 200 ISO strings and add a month | 219,421 | 233,812 | +8.5% | +8.5%, +12.1%, +4.1% | -1.6% |

Where the polyfill runs its own implementation (Node here; browsers without
`Temporal`), every named-zone case takes 66-84% less time. Against a native
`Temporal` (Bun), reading instants takes 44% less time, while resolving
wall-clock day cells to instants takes 89% more, about 8.5 µs per cell instead
of 4.6 µs, since each takes two Intl readings; formatting a month of cells is at
parity. The `'local'` and `'UTC'` cases, which never used the polyfill, are
within 2-9%: the local zone now carries milliseconds, and arrays check for years
0-99.

`node packages/vfull-ui-headless-calendar/bench/summarize.cjs --verify-current`
checks that all eight reports cover the same cases and that the recorded source
hashes match the current files.
