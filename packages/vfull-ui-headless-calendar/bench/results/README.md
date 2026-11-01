# vfull-ui-headless-calendar measurements

These records supersede the earlier same-process comparison. Each timed
implementation runs alone in a fresh process. Four comparison pairs use
balanced upstream-first / VPM-first order; two further pairs run identical
upstream code in separate processes as controls. Warmup lasts at least 150 ms
per case, followed by recalibration on warmed code, four warmup blocks and 12
recorded blocks. Both workers in a pair use the same iteration count, targeting
10 ms blocks with a one-million-operation cap. Results are retained and checked
outside timing. All samples are kept, including outliers.

The comparison units are per-process medians. The change column is the median
of four process-pair percentage changes; the two order columns expose order
sensitivity. The nanosecond columns are medians of the four process medians.
They need not produce exactly the percentage in the change column.

A direction is unestablished when it reverses across processes or any pair
overlaps the largest absolute control difference (with a minimum 2% floor).
This is a conservative descriptive check, not a confidence interval. Process
isolation reduces shared JIT feedback; environmental noise and GC remain.
Negative changes mean less time; these are local CPU measurements, not
application throughput or latency guarantees.

## Node 24.22.1

Recorded 2026-11-01T09:56:37.364Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| named zone / 200 timestamps to wall-clock markers | 1274749 | 251635 | -80.3% | -80.5% | -79.6% | 3.2% | lower time in every pair, beyond control spread |
| named zone / 42 day cells to instants and offsets | 488824 | 112035 | -76.9% | -76.9% | -76.9% | 5.3% | lower time in every pair, beyond control spread |
| named zone / format 42 day cells | 546971 | 224388 | -59.1% | -57.1% | -60.1% | 4.2% | lower time in every pair, beyond control spread |
| named zone / parse 200 ISO strings | 1275136 | 346076 | -72.8% | -72.3% | -73.7% | 6% | lower time in every pair, beyond control spread |
| local zone / 42 day cells to instants | 11962 | 12561 | 5.3% | 39.2% | 4.5% | 1.6% | higher time in every pair, beyond control spread |
| UTC / parse 200 ISO strings and add a month | 112301 | 118215 | 5.3% | 9.1% | 4% | 5% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T09:57:01.936Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| named zone / 200 timestamps to wall-clock markers | 521579 | 248061 | -52.2% | -51.6% | -52.2% | 2% | lower time in every pair, beyond control spread |
| named zone / 42 day cells to instants and offsets | 101340 | 112536 | 9.9% | 8.9% | 13% | 2.1% | higher time in every pair, beyond control spread |
| named zone / format 42 day cells | 193911 | 208332 | 6.9% | 5.9% | 8.2% | 2.1% | higher time in every pair, beyond control spread |
| named zone / parse 200 ISO strings | 512151 | 324503 | -37.2% | -36.9% | -37.2% | 0.2% | lower time in every pair, beyond control spread |
| local zone / 42 day cells to instants | 4925 | 5285 | 8.5% | 8.5% | 7.8% | 6.1% | unestablished at this precision |
| UTC / parse 200 ISO strings and add a month | 85996 | 95101 | 11% | 17.1% | 6.2% | 57.4% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vfull-ui-headless-calendar/bench/results/node-isolated.json node packages/vfull-ui-headless-calendar/bench/compare.cjs
OUTPUT=packages/vfull-ui-headless-calendar/bench/results/bun-isolated.json bun packages/vfull-ui-headless-calendar/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vfull-ui-headless-calendar
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
