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

Recorded 2026-11-01T12:23:40.714Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 474 | 343 | -27.6% | -27.6% | -27.6% | 1.4% | lower time in every pair, beyond control spread |
| logger / structured request | 567 | 589 | 4% | 4.1% | 3.7% | 1.7% | higher time in every pair, beyond control spread |
| logger / nested data | 6308 | 4110 | -34.8% | -33.6% | -36% | 1.9% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 48 | 56 | 14% | 14.3% | 14% | 4.7% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 944 | 808 | -14.8% | -14.8% | -14% | 3.7% | lower time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 46928 | 52717 | 12.4% | 11.8% | 12.8% | 1.9% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 222 | 212 | -5.1% | -4.7% | -5.8% | 1% | lower time in every pair, beyond control spread |
| callable / encode structured payload | 851 | 1191 | 40% | 39.1% | 41% | 1.4% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1042 | 1211 | 16.1% | 15.3% | 16.3% | 1.6% | higher time in every pair, beyond control spread |
| request / callable without token headers | 2062 | 2336 | 13.3% | 18.3% | 9.7% | 2.3% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 257 | 210 | -18.3% | -18.7% | 32.6% | 3.8% | unestablished at this precision |
| trace / legacy decimal span extraction | 242 | 218 | -10.1% | -10.7% | -4.6% | 50.1% | unestablished at this precision |
| discovery / 64 grouped endpoints | 11778 | 22392 | 92.4% | 87.1% | 93.5% | 5.8% | higher time in every pair, beyond control spread |
| secret / runtime string read | 456 | 453 | 0.7% | 0.7% | 0.7% | 3.4% | unestablished at this precision |
| declaration / Firestore written trigger | 855 | 923 | 7.5% | 8.9% | 6.5% | 0.7% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 3155 | 1742 | -45% | -44.2% | -45.4% | 1.9% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T12:24:45.238Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 576 | 557 | -3.8% | -2.6% | -7.3% | 3.2% | unestablished at this precision |
| logger / structured request | 244 | 246 | 0.1% | 0.1% | 0.6% | 15.4% | unestablished at this precision |
| logger / nested data | 7117 | 3715 | -48.5% | -50.7% | -43% | 11.2% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 63 | 67 | 9.7% | 6.8% | 11% | 2.2% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 385 | 476 | 24.5% | 22% | 31.4% | 0.6% | higher time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 38136 | 43566 | 13.4% | 12.9% | 47.9% | 0.9% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 261 | 245 | -6.2% | -7.8% | 340.4% | 3.6% | unestablished at this precision |
| callable / encode structured payload | 1263 | 908 | -27.1% | -30.4% | -21.4% | 2.3% | lower time in every pair, beyond control spread |
| callable / decode structured payload | 1348 | 896 | -33% | -33% | -24.7% | 6.6% | lower time in every pair, beyond control spread |
| request / callable without token headers | 1729 | 2004 | 15.9% | 10.1% | 86.5% | 1.6% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 188 | 156 | -16.3% | 7.2% | -16.3% | 2.5% | unestablished at this precision |
| trace / legacy decimal span extraction | 178 | 179 | -1.3% | 45.8% | -9.5% | 4.3% | unestablished at this precision |
| discovery / 64 grouped endpoints | 13539 | 14303 | 7.5% | 9.2% | 7.5% | 1.7% | unestablished at this precision |
| secret / runtime string read | 3 | 3 | -20% | -1.7% | -20% | 65.4% | unestablished at this precision |
| declaration / Firestore written trigger | 535 | 771 | 41.9% | 44.1% | 41.9% | 0.4% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 2589 | 1599 | -38% | -38.9% | -36.8% | 2.5% | lower time in every pair, beyond control spread |

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
