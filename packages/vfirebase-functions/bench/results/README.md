# vfirebase-functions measurements

Each timed
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

Recorded 2026-11-01T12:42:40.304Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 481 | 345 | -28.6% | -28.6% | -27.8% | 1.9% | lower time in every pair, beyond control spread |
| logger / structured request | 568 | 588 | 3.7% | 4.3% | 2.7% | 14% | unestablished at this precision |
| logger / nested data | 6243 | 4068 | -34.5% | -34.1% | -35.4% | 0.7% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 48 | 56 | 15.6% | 15.3% | 19.4% | 1.2% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 941 | 789 | -16.2% | -21% | 43.3% | 3.8% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 46665 | 52765 | 13.2% | 12.2% | 20% | 31.6% | unestablished at this precision |
| request / initialized HTTP handler | 225 | 210 | -6.9% | -9.2% | -4.8% | 0.5% | unestablished at this precision |
| callable / encode structured payload | 845 | 1201 | 42.4% | 44.7% | 40.1% | 6.2% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1045 | 1295 | 24.2% | 16.5% | 35.1% | 1.4% | higher time in every pair, beyond control spread |
| request / callable without token headers | 1985 | 2404 | 20.4% | 18.4% | 24.3% | 0.8% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 255 | 207 | -18.7% | -23% | -18.4% | 2.9% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 241 | 213 | -11.6% | -12.3% | -11.6% | 1.2% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 11786 | 22370 | 90.7% | 85.7% | 93.5% | 2.3% | higher time in every pair, beyond control spread |
| secret / runtime string read | 450 | 461 | 2.4% | 2.4% | 63.5% | 5.6% | unestablished at this precision |
| declaration / Firestore written trigger | 843 | 926 | 9.9% | 9.9% | 30.1% | 1% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 3130 | 1724 | -44.7% | -45.9% | -31.8% | 2.8% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T12:43:47.677Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 571 | 551 | -3.5% | -2.8% | -7.3% | 2.2% | lower time in every pair, beyond control spread |
| logger / structured request | 249 | 247 | -2.5% | -1% | -2.7% | 8.4% | unestablished at this precision |
| logger / nested data | 7044 | 3757 | -47.3% | -46.1% | -48.1% | 10.9% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 63 | 67 | 10.2% | 6.2% | 10.2% | 4.8% | unestablished at this precision |
| declaration / HTTP endpoint | 379 | 475 | 26.7% | 23.7% | 37.9% | 2.6% | higher time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 37747 | 43344 | 15.3% | 10.4% | 17.9% | 3.1% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 267 | 242 | -7.9% | -9.7% | -7.9% | 102.6% | unestablished at this precision |
| callable / encode structured payload | 1273 | 910 | -29.3% | -30% | -28.2% | 4.5% | lower time in every pair, beyond control spread |
| callable / decode structured payload | 1360 | 860 | -36.4% | -36.4% | -35.7% | 4% | lower time in every pair, beyond control spread |
| request / callable without token headers | 1776 | 1938 | 9.4% | 4.9% | 13.1% | 7.5% | unestablished at this precision |
| trace / portable header extraction | 191 | 150 | -20.9% | -18.3% | -21.8% | 6.1% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 178 | 171 | -3.7% | 1.9% | -4.7% | 2.1% | unestablished at this precision |
| discovery / 64 grouped endpoints | 13467 | 14770 | 9.7% | 16.3% | 3.9% | 1.9% | unestablished at this precision |
| secret / runtime string read | 3 | 3 | -2.1% | -20.8% | 0.5% | 170.8% | unestablished at this precision |
| declaration / Firestore written trigger | 559 | 770 | 39.6% | 42.5% | 35.1% | 0.7% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 2651 | 1591 | -38.7% | -40.6% | -38.7% | 5.4% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vfirebase-functions/bench/results/node-isolated.json node packages/vfirebase-functions/bench/compare.cjs
OUTPUT=packages/vfirebase-functions/bench/results/bun-isolated.json bun packages/vfirebase-functions/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vfirebase-functions
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
