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

Recorded 2026-11-01T19:52:36.452Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 574 | 410 | -28.2% | -28.2% | -28.7% | 2.8% | lower time in every pair, beyond control spread |
| logger / structured request | 680 | 706 | 3.4% | 3.4% | 4.3% | 0.7% | higher time in every pair, beyond control spread |
| logger / nested data | 7496 | 4902 | -34.9% | -34.9% | -34.7% | 2% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 58 | 67 | 14.8% | 14.1% | 15.1% | 0.5% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 1157 | 905 | -19.3% | -19.3% | -0.5% | 25.2% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 56022 | 63109 | 12.4% | 12.5% | 10.2% | 12% | unestablished at this precision |
| request / initialized HTTP handler | 277 | 250 | -9.7% | -9.4% | -29.1% | 1.5% | lower time in every pair, beyond control spread |
| callable / encode structured payload | 1011 | 1428 | 41% | 41% | 30% | 0.5% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1244 | 1460 | 16.9% | 16.9% | 16.2% | 2.7% | higher time in every pair, beyond control spread |
| request / callable without token headers | 2412 | 2852 | 16.5% | 13.1% | 17.6% | 11.5% | unestablished at this precision |
| trace / portable header extraction | 306 | 247 | -19.2% | -23.2% | -18.8% | 42.9% | unestablished at this precision |
| trace / legacy decimal span extraction | 296 | 256 | -13.5% | -16.9% | -13.5% | 7.6% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 14036 | 26793 | 90.5% | 92.7% | 90.5% | 5.2% | higher time in every pair, beyond control spread |
| secret / runtime string read | 542 | 540 | 0.9% | 0.3% | 2.7% | 1% | unestablished at this precision |
| declaration / Firestore written trigger | 1005 | 1106 | 9.2% | 9.2% | 7.2% | 1% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 3766 | 2057 | -45.6% | -46.4% | -44.4% | 6.6% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T19:54:48.589Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 1070 | 1167 | -18.6% | 66% | -35.5% | 41.5% | unestablished at this precision |
| logger / structured request | 468 | 338 | -29.9% | 6.6% | -29.9% | 62.9% | unestablished at this precision |
| logger / nested data | 12971 | 4792 | -61.6% | -40.4% | -62.9% | 34.9% | unestablished at this precision |
| initializer / already initialized handler | 79 | 91 | 14.8% | 0.6% | 14.8% | 8% | unestablished at this precision |
| declaration / HTTP endpoint | 655 | 660 | -1.9% | 16.1% | -1.9% | 26.7% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 52079 | 53255 | 1.3% | 6.3% | -3.5% | 20.4% | unestablished at this precision |
| request / initialized HTTP handler | 349 | 312 | -10.5% | -0.8% | -10.5% | 42.4% | unestablished at this precision |
| callable / encode structured payload | 1621 | 1152 | -28.9% | -30.1% | -28.9% | 78% | unestablished at this precision |
| callable / decode structured payload | 1609 | 1239 | -22.6% | -28.8% | -22.6% | 42.4% | unestablished at this precision |
| request / callable without token headers | 2182 | 2511 | 22.5% | 9.5% | 51.2% | 52.9% | unestablished at this precision |
| trace / portable header extraction | 228 | 193 | -15.3% | -28.5% | 33.5% | 10.6% | unestablished at this precision |
| trace / legacy decimal span extraction | 237 | 201 | -13.7% | -22.5% | 81.9% | 31.2% | unestablished at this precision |
| discovery / 64 grouped endpoints | 16589 | 16783 | 1.1% | 0.3% | 188.6% | 23% | unestablished at this precision |
| secret / runtime string read | 5 | 4 | -7.3% | -7.3% | 65.6% | 88.2% | unestablished at this precision |
| declaration / Firestore written trigger | 979 | 1069 | -1.7% | -55.6% | 77% | 20% | unestablished at this precision |
| event / materialize changed protobuf documents | 8274 | 7495 | -60.5% | -92.2% | 174.8% | 62.5% | unestablished at this precision |

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
