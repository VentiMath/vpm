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

Recorded 2026-11-01T17:56:00.228Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 495 | 348 | -29.6% | -28.8% | -29.6% | 0.7% | lower time in every pair, beyond control spread |
| logger / structured request | 581 | 659 | 11.1% | 19.1% | 10.6% | 0.9% | higher time in every pair, beyond control spread |
| logger / nested data | 6601 | 4297 | -33.9% | -34.6% | -27.7% | 3.9% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 50 | 58 | 16.1% | 12.7% | 20.8% | 2.4% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 1000 | 910 | -12.1% | -12.1% | 5.1% | 3.1% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 52420 | 62891 | 12% | 10.4% | 34.3% | 5.1% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 231 | 214 | -7.5% | -6.9% | -38% | 0.6% | lower time in every pair, beyond control spread |
| callable / encode structured payload | 874 | 1243 | 40.3% | 41.7% | 12.5% | 1.4% | unestablished at this precision |
| callable / decode structured payload | 1074 | 1252 | 16% | 17.3% | -5% | 1.6% | unestablished at this precision |
| request / callable without token headers | 2130 | 2516 | 15.8% | 19.8% | 14.1% | 2.4% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 265 | 233 | -18.7% | -18.7% | -15.8% | 3.1% | unestablished at this precision |
| trace / legacy decimal span extraction | 249 | 220 | -10.7% | -10.7% | -18.9% | 28.4% | unestablished at this precision |
| discovery / 64 grouped endpoints | 12342 | 23024 | 85.9% | 85.9% | 78.1% | 4.8% | higher time in every pair, beyond control spread |
| secret / runtime string read | 467 | 464 | -0.7% | 0.5% | -1.2% | 2.2% | unestablished at this precision |
| declaration / Firestore written trigger | 941 | 949 | 1.2% | 3.5% | -0.1% | 1.7% | unestablished at this precision |
| event / materialize changed protobuf documents | 3235 | 1885 | -41.9% | -43.4% | -40.4% | 0.9% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T17:57:33.649Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 700 | 600 | -5.6% | -5.6% | -1.3% | 34.5% | unestablished at this precision |
| logger / structured request | 270 | 266 | 1.6% | 1.6% | -12.1% | 37.9% | unestablished at this precision |
| logger / nested data | 7385 | 3827 | -47.4% | -45.6% | -63.5% | 17.8% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 71 | 77 | 7.1% | 7.1% | -18.7% | 10.1% | unestablished at this precision |
| declaration / HTTP endpoint | 501 | 529 | 31.7% | 31.7% | 7.9% | 50.7% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 45850 | 48542 | 5.9% | 11.2% | -31.6% | 154.2% | unestablished at this precision |
| request / initialized HTTP handler | 393 | 287 | -23.8% | -30.2% | -11% | 796.9% | unestablished at this precision |
| callable / encode structured payload | 1502 | 1042 | -28.1% | -28.1% | 7% | 32% | unestablished at this precision |
| callable / decode structured payload | 1418 | 964 | -32.1% | -35% | -28.3% | 77% | unestablished at this precision |
| request / callable without token headers | 1927 | 2115 | 11.7% | 4.9% | 19.1% | 65.4% | unestablished at this precision |
| trace / portable header extraction | 213 | 169 | -20.5% | 34.7% | -20.5% | 41.2% | unestablished at this precision |
| trace / legacy decimal span extraction | 191 | 197 | 0.8% | -2.8% | 11.2% | 1.6% | unestablished at this precision |
| discovery / 64 grouped endpoints | 13173 | 14865 | 17.7% | 6.4% | 22.6% | 21.7% | unestablished at this precision |
| secret / runtime string read | 3 | 3 | 0.7% | -44.1% | 106.1% | 517.9% | unestablished at this precision |
| declaration / Firestore written trigger | 612 | 964 | 50.5% | 29.9% | 84.2% | 38.8% | unestablished at this precision |
| event / materialize changed protobuf documents | 2783 | 1862 | -33.9% | -24.7% | -33.9% | 63% | unestablished at this precision |

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
