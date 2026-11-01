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

Recorded 2026-11-01T16:29:22.913Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 476 | 344 | -27.9% | -28.1% | -27.9% | 7.3% | lower time in every pair, beyond control spread |
| logger / structured request | 565 | 596 | 4.6% | 7.1% | 4.6% | 5.1% | unestablished at this precision |
| logger / nested data | 6388 | 4114 | -35.3% | -35.2% | -35.3% | 1.4% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 49 | 57 | 16.1% | 18.7% | 10.7% | 1.8% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 970 | 804 | -20.3% | -18% | -22.1% | 1.1% | lower time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 46759 | 55698 | 16.9% | 9.1% | 33.6% | 4% | unestablished at this precision |
| request / initialized HTTP handler | 223 | 211 | -6% | -3.9% | -6% | 2.9% | unestablished at this precision |
| callable / encode structured payload | 840 | 1249 | 47.2% | 45.3% | 151.4% | 3.9% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1053 | 1247 | 16.4% | 14.7% | 19.8% | 4.7% | higher time in every pair, beyond control spread |
| request / callable without token headers | 2037 | 2419 | 16.6% | 17.5% | 16% | 8.5% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 256 | 212 | -16.6% | -14.7% | -18.6% | 3.6% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 242 | 216 | -12.1% | -10.4% | -12.1% | 6.4% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 11595 | 22393 | 91.4% | 87.4% | 91.4% | 6.3% | higher time in every pair, beyond control spread |
| secret / runtime string read | 452 | 454 | -0.9% | -1.8% | 1.6% | 2.8% | unestablished at this precision |
| declaration / Firestore written trigger | 848 | 915 | 7.8% | 6.1% | 8.8% | 45.8% | unestablished at this precision |
| event / materialize changed protobuf documents | 3169 | 1733 | -45.2% | -46.1% | -44.5% | 5% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T16:30:28.154Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 619 | 548 | -11.4% | -8.4% | -13.4% | 6.9% | unestablished at this precision |
| logger / structured request | 259 | 252 | -1.2% | 3.7% | -4.6% | 1.8% | unestablished at this precision |
| logger / nested data | 7183 | 3858 | -46.7% | -46.9% | -46.7% | 9.9% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 68 | 73 | 8.7% | 8.7% | 5.7% | 1.9% | unestablished at this precision |
| declaration / HTTP endpoint | 392 | 504 | 26.4% | 21.5% | 31.6% | 5% | higher time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 39054 | 44752 | 15.6% | 18.3% | 14.6% | 1.7% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 258 | 278 | 3.2% | 1% | 8.6% | 3.9% | unestablished at this precision |
| callable / encode structured payload | 1280 | 969 | -25.3% | -26.3% | -25% | 2.1% | lower time in every pair, beyond control spread |
| callable / decode structured payload | 1375 | 938 | -32% | -31.7% | -32% | 1.4% | lower time in every pair, beyond control spread |
| request / callable without token headers | 1784 | 2129 | 21.8% | 13.3% | 27.4% | 3.1% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 194 | 167 | -14.6% | -16.5% | -12.5% | 6.3% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 180 | 180 | -1.5% | -9.1% | 6.4% | 3% | unestablished at this precision |
| discovery / 64 grouped endpoints | 13881 | 14396 | 2.7% | 2.3% | 4.6% | 0.4% | higher time in every pair, beyond control spread |
| secret / runtime string read | 3 | 3 | -21.1% | -44.3% | 22% | 65.4% | unestablished at this precision |
| declaration / Firestore written trigger | 551 | 809 | 45.1% | 34.4% | 55.3% | 112.3% | unestablished at this precision |
| event / materialize changed protobuf documents | 2573 | 1655 | -35.4% | -42.9% | -31.5% | 47.7% | unestablished at this precision |

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
