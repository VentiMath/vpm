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

Recorded 2026-11-01T14:41:06.719Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 480 | 345 | -28.1% | -42.8% | -26.3% | 3.6% | lower time in every pair, beyond control spread |
| logger / structured request | 569 | 590 | 3% | 2.9% | 4% | 2.1% | higher time in every pair, beyond control spread |
| logger / nested data | 6330 | 4149 | -34.7% | -34.7% | -33.1% | 2% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 49 | 56 | 16% | 15.4% | 17% | 1.2% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 987 | 785 | -19.9% | -18.2% | -20.6% | 2.9% | lower time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 47272 | 53633 | 13.9% | 10.8% | 68.9% | 4.2% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 222 | 212 | -4.9% | -4.9% | -4.8% | 9.1% | unestablished at this precision |
| callable / encode structured payload | 839 | 1190 | 41.4% | 42.5% | 41.1% | 2.4% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1053 | 1218 | 14.5% | 14.4% | 15.7% | 4.8% | higher time in every pair, beyond control spread |
| request / callable without token headers | 2044 | 2437 | 17.4% | 18.9% | 17.4% | 3.7% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 257 | 207 | -18.9% | -18.5% | -19.6% | 44% | unestablished at this precision |
| trace / legacy decimal span extraction | 241 | 217 | -10.8% | -10% | -11.6% | 12.8% | unestablished at this precision |
| discovery / 64 grouped endpoints | 12150 | 22120 | 81.3% | 81.3% | 81.1% | 5.9% | higher time in every pair, beyond control spread |
| secret / runtime string read | 454 | 454 | -0.3% | 2.2% | -5.5% | 1.1% | unestablished at this precision |
| declaration / Firestore written trigger | 844 | 922 | 9.4% | 9.4% | 18.4% | 1.5% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 3129 | 1772 | -43.4% | -39.9% | -45.1% | 0.9% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T14:42:12.154Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 573 | 547 | -4.9% | -6.4% | -4.9% | 3.4% | unestablished at this precision |
| logger / structured request | 249 | 241 | -3.3% | -3.5% | -3.3% | 2% | unestablished at this precision |
| logger / nested data | 7280 | 3777 | -48.2% | -49.6% | -48.2% | 8.9% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 62 | 71 | 13.8% | 17% | 13.2% | 3.5% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 384 | 475 | 24.7% | 23.2% | 26.3% | 2.6% | higher time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 37526 | 43484 | 15.7% | 18% | 14% | 6.8% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 265 | 247 | -6.2% | -9% | -6% | 2.3% | lower time in every pair, beyond control spread |
| callable / encode structured payload | 1253 | 924 | -26.2% | -28% | -24.1% | 2.3% | lower time in every pair, beyond control spread |
| callable / decode structured payload | 1327 | 884 | -33.3% | -34.3% | -32.5% | 3.9% | lower time in every pair, beyond control spread |
| request / callable without token headers | 1708 | 2038 | 17.9% | 17.9% | 24.8% | 5.5% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 204 | 160 | -19.8% | -9.5% | -29.2% | 13.4% | unestablished at this precision |
| trace / legacy decimal span extraction | 181 | 167 | -7.2% | -7.2% | -5% | 3% | unestablished at this precision |
| discovery / 64 grouped endpoints | 13972 | 14040 | -0.4% | -27.5% | 0.2% | 1.7% | unestablished at this precision |
| secret / runtime string read | 3 | 3 | 1.1% | -17.5% | 1.1% | 63.9% | unestablished at this precision |
| declaration / Firestore written trigger | 576 | 762 | 34.1% | 41.1% | 22.2% | 3.9% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 2665 | 1584 | -40.6% | -40.6% | -40.7% | 10.7% | lower time in every pair, beyond control spread |

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
