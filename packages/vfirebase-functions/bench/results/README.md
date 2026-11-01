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
Negative changes mean less time; these are local workload measurements, not
application throughput or latency guarantees.

## Node 24.22.1

Recorded 2026-11-01T17:21:10.649Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 475 | 341 | -28.1% | -26.2% | -28.7% | 1.8% | lower time in every pair, beyond control spread |
| logger / structured request | 565 | 594 | 4.8% | 4.8% | 4.9% | 1.1% | higher time in every pair, beyond control spread |
| logger / nested data | 6337 | 4206 | -34.3% | -34.3% | -35.2% | 6.4% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 48 | 56 | 17% | 17.4% | 14.1% | 1.6% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 925 | 811 | -7.3% | -19.6% | 15.5% | 4.4% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 46605 | 55711 | 19% | 19.7% | 17.4% | 1% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 224 | 220 | -3.3% | 27.1% | -3.3% | 1.1% | unestablished at this precision |
| callable / encode structured payload | 842 | 1226 | 45% | 46.4% | 43.9% | 4.5% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1039 | 1202 | 15.1% | 21.1% | 14.9% | 5.1% | higher time in every pair, beyond control spread |
| request / callable without token headers | 2137 | 2450 | 15.9% | 18.2% | 14.1% | 17.5% | unestablished at this precision |
| trace / portable header extraction | 259 | 212 | -18.5% | -18.5% | -17.1% | 7.7% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 245 | 218 | -12.9% | -26.2% | -9.8% | 4.3% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 11850 | 22167 | 88.4% | 88.4% | 87.9% | 2.9% | higher time in every pair, beyond control spread |
| secret / runtime string read | 457 | 450 | -1.8% | -1.8% | -1.5% | 3.8% | unestablished at this precision |
| declaration / Firestore written trigger | 853 | 933 | 9.4% | 8.9% | 11.4% | 3.3% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 3127 | 1713 | -45.2% | -45.9% | -44.4% | 1% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T17:22:16.311Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 575 | 543 | -6.5% | -36.8% | -3.8% | 1.4% | lower time in every pair, beyond control spread |
| logger / structured request | 243 | 253 | 3.5% | 0.3% | 10.7% | 2.8% | unestablished at this precision |
| logger / nested data | 7028 | 3752 | -45.4% | 1.9% | -45.4% | 9.8% | unestablished at this precision |
| initializer / already initialized handler | 64 | 68 | 6.5% | 16.1% | 0.7% | 11.8% | unestablished at this precision |
| declaration / HTTP endpoint | 400 | 503 | 32.2% | 34% | 30.4% | 5.1% | higher time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 38602 | 43414 | 12.4% | 6.1% | 12.4% | 5.2% | unestablished at this precision |
| request / initialized HTTP handler | 257 | 250 | -2.6% | -2.8% | -2.5% | 7% | unestablished at this precision |
| callable / encode structured payload | 1264 | 924 | -27.3% | -25.6% | -27.3% | 12.1% | lower time in every pair, beyond control spread |
| callable / decode structured payload | 1365 | 867 | -36.8% | -36.7% | -36.8% | 6.3% | lower time in every pair, beyond control spread |
| request / callable without token headers | 1748 | 1921 | 10% | 10% | 7.1% | 8.6% | unestablished at this precision |
| trace / portable header extraction | 190 | 151 | -20.3% | -20.8% | -15.8% | 2.9% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 176 | 160 | -5% | -7.5% | -4.1% | 1.8% | unestablished at this precision |
| discovery / 64 grouped endpoints | 13390 | 14138 | 5.6% | 4.3% | 5.6% | 6.1% | unestablished at this precision |
| secret / runtime string read | 2 | 2 | 16.9% | -6.8% | 25.5% | 63.2% | unestablished at this precision |
| declaration / Firestore written trigger | 547 | 778 | 42.3% | 41% | 42.3% | 5.6% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 2602 | 1574 | -40.4% | -42.2% | -37.3% | 5.1% | lower time in every pair, beyond control spread |

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
