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

Recorded 2026-11-01T13:24:14.211Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 496 | 365 | -27.1% | -25.6% | -27.7% | 5.2% | lower time in every pair, beyond control spread |
| logger / structured request | 584 | 628 | 7.3% | 9% | 6% | 7.6% | unestablished at this precision |
| logger / nested data | 6400 | 4312 | -32.5% | -33.6% | -31.7% | 8.4% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 50 | 59 | 16.6% | 17.1% | 16.6% | 94.7% | unestablished at this precision |
| declaration / HTTP endpoint | 1004 | 825 | -17.8% | -5.3% | -20.1% | 4% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 48569 | 55872 | 15% | 15% | 17.2% | 26.1% | unestablished at this precision |
| request / initialized HTTP handler | 231 | 218 | -5.5% | -5.4% | -8.1% | 1.3% | lower time in every pair, beyond control spread |
| callable / encode structured payload | 877 | 1254 | 41.8% | 42.3% | 41.8% | 1.5% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1074 | 1259 | 17% | 15.2% | 17.5% | 55.4% | unestablished at this precision |
| request / callable without token headers | 2116 | 2470 | 18.5% | 18.5% | 11.3% | 39.4% | unestablished at this precision |
| trace / portable header extraction | 280 | 217 | -22.5% | 0.3% | -22.5% | 4.1% | unestablished at this precision |
| trace / legacy decimal span extraction | 266 | 224 | -16% | -29.1% | -16% | 1.3% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 12430 | 23073 | 81% | 81% | 85.9% | 0.6% | higher time in every pair, beyond control spread |
| secret / runtime string read | 478 | 466 | -1.2% | -3.7% | -1% | 8.4% | unestablished at this precision |
| declaration / Firestore written trigger | 893 | 970 | 7.6% | 5.2% | 11.6% | 4.4% | unestablished at this precision |
| event / materialize changed protobuf documents | 3290 | 1785 | -45.4% | -46.4% | -44.9% | 1.2% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T13:25:18.648Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 639 | 602 | -6.4% | -8.9% | -3% | 8% | unestablished at this precision |
| logger / structured request | 270 | 262 | -4.2% | -1% | -4.2% | 7.6% | unestablished at this precision |
| logger / nested data | 7695 | 4016 | -47.8% | -50.2% | -47.8% | 12.7% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 72 | 76 | 1.9% | 1.7% | 1.9% | 7.8% | unestablished at this precision |
| declaration / HTTP endpoint | 417 | 519 | 25.3% | 21.6% | 29.8% | 9.4% | higher time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 39863 | 46928 | 17.9% | 19.5% | 12.5% | 3.9% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 279 | 271 | -0.1% | -0.1% | 2.7% | 286.4% | unestablished at this precision |
| callable / encode structured payload | 1348 | 988 | -26.1% | -26.1% | 19.6% | 24.6% | unestablished at this precision |
| callable / decode structured payload | 1417 | 940 | -33% | -32.1% | -33.5% | 289.5% | unestablished at this precision |
| request / callable without token headers | 1808 | 2155 | 17.6% | 21.4% | 16.5% | 7.6% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 199 | 159 | -18.1% | -18.1% | -24% | 5.7% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 188 | 177 | -5.6% | -5.6% | -1% | 2.7% | unestablished at this precision |
| discovery / 64 grouped endpoints | 14715 | 14489 | -3.4% | 2.3% | -5.1% | 1.1% | unestablished at this precision |
| secret / runtime string read | 4 | 3 | -25.7% | -48% | -3.1% | 173.7% | unestablished at this precision |
| declaration / Firestore written trigger | 562 | 841 | 49.1% | 49.9% | 42.7% | 3.7% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 2666 | 1722 | -36.8% | -34.8% | -37.3% | 6.2% | lower time in every pair, beyond control spread |

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
