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

Recorded 2026-11-01T15:54:24.229Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 477 | 344 | -27.9% | -28.1% | -27.9% | 2.4% | lower time in every pair, beyond control spread |
| logger / structured request | 566 | 595 | 5.8% | 4.3% | 6.3% | 3.3% | unestablished at this precision |
| logger / nested data | 6310 | 4035 | -35.3% | -34.9% | -36.4% | 3.5% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 48 | 55 | 14.7% | 11.5% | 14.8% | 3.2% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 936 | 753 | -19.5% | -4.3% | -24% | 3.4% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 47226 | 53299 | 13.9% | 14.4% | 12.9% | 2% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 227 | 210 | -8.4% | -6.2% | -8.5% | 2.4% | lower time in every pair, beyond control spread |
| callable / encode structured payload | 844 | 1190 | 42.5% | 40.8% | 42.5% | 1% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1040 | 1206 | 15.8% | 15.7% | 15.8% | 4.2% | higher time in every pair, beyond control spread |
| request / callable without token headers | 2080 | 2409 | 16.4% | 13.9% | 17% | 11.3% | unestablished at this precision |
| trace / portable header extraction | 258 | 209 | -19.4% | -43.5% | -19.4% | 1.5% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 248 | 216 | -12.7% | -13.6% | -11.7% | 5.7% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 11832 | 22211 | 86.7% | 86.7% | 87.1% | 92.6% | unestablished at this precision |
| secret / runtime string read | 458 | 451 | -1.6% | -3.1% | 0.2% | 6.5% | unestablished at this precision |
| declaration / Firestore written trigger | 845 | 930 | 9% | 8.1% | 10.6% | 3.2% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 3157 | 1722 | -45.5% | -45.9% | -44.9% | 6% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T15:55:27.427Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 591 | 545 | -3.5% | -7.6% | 33.6% | 15.6% | unestablished at this precision |
| logger / structured request | 242 | 239 | -0.9% | -0.9% | 4.1% | 1.9% | unestablished at this precision |
| logger / nested data | 7162 | 3703 | -48.7% | -49.3% | -48% | 13.1% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 61 | 69 | 12.6% | 24.1% | 12.6% | 1.9% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 375 | 476 | 28.7% | 26.4% | 28.7% | 9.2% | higher time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 38067 | 43765 | 15.2% | 15.7% | 13.4% | 55.7% | unestablished at this precision |
| request / initialized HTTP handler | 261 | 246 | -6.1% | -2.2% | -9.2% | 10.1% | unestablished at this precision |
| callable / encode structured payload | 1249 | 911 | -26.4% | -25% | -27.4% | 6.7% | lower time in every pair, beyond control spread |
| callable / decode structured payload | 1353 | 837 | -38% | -38% | -37.6% | 64.3% | unestablished at this precision |
| request / callable without token headers | 1711 | 1956 | 15.8% | 16.6% | 9.8% | 6.8% | unestablished at this precision |
| trace / portable header extraction | 189 | 156 | -17.4% | -17.4% | -16.6% | 10.8% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 182 | 160 | -12% | -9.8% | -15.3% | 7.3% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 13608 | 13833 | 1.1% | 2.2% | 1% | 6.1% | unestablished at this precision |
| secret / runtime string read | 3 | 2 | -21.4% | -44.1% | -2.2% | 174.7% | unestablished at this precision |
| declaration / Firestore written trigger | 544 | 758 | 39.8% | 40.1% | 39.5% | 60% | unestablished at this precision |
| event / materialize changed protobuf documents | 2550 | 1599 | -37.5% | -38.2% | -36.6% | 4.6% | lower time in every pair, beyond control spread |

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
