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

Recorded 2026-11-03T06:36:30.500Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| declaration / app task queue | 1111 | 1333 | 20% | 20% | 20.3% | 2.8% | higher time in every pair, beyond control spread |
| task / initialized emulator request | 1525 | 1946 | 27.3% | 32.1% | 23.7% | 4.5% | higher time in every pair, beyond control spread |
| parameter / validation specification | 62 | 94 | 52.8% | 56.2% | 49.2% | 5.2% | higher time in every pair, beyond control spread |
| logger / formatted status | 470 | 339 | -27.4% | -25.3% | -28.3% | 3.1% | lower time in every pair, beyond control spread |
| logger / structured request | 557 | 583 | 4.8% | 22.4% | 3.2% | 2.4% | higher time in every pair, beyond control spread |
| logger / nested data | 6271 | 4076 | -34.9% | -33.5% | -35.5% | 1.1% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 57 | 61 | 7.5% | 8.5% | 6.2% | 1.4% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 996 | 809 | -17.8% | -12% | -22.4% | 3.8% | lower time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 46644 | 53001 | 12.5% | 14.4% | 2.8% | 27.9% | unestablished at this precision |
| request / initialized HTTP handler | 228 | 210 | -7.3% | -7.2% | -8% | 0.7% | lower time in every pair, beyond control spread |
| callable / encode structured payload | 844 | 1198 | 43.1% | 43.1% | 42.7% | 1% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1039 | 1216 | 17% | 17.8% | 16.5% | 22.9% | unestablished at this precision |
| request / callable without token headers | 2048 | 2308 | 12.7% | 12.7% | 10.6% | 15.6% | unestablished at this precision |
| trace / portable header extraction | 255 | 208 | -18.8% | -17.6% | -20.1% | 13.2% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 242 | 216 | -11.3% | -10.5% | -11.4% | 4.5% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 11779 | 22278 | 89.5% | 89.7% | 86.6% | 4.4% | higher time in every pair, beyond control spread |
| secret / runtime string read | 466 | 468 | 0.6% | 1.4% | -0.9% | 7.2% | unestablished at this precision |
| declaration / Firestore written trigger | 844 | 920 | 8.9% | 9.3% | 8.4% | 2.2% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 3183 | 1544 | -51.6% | -55.5% | -51.1% | 4% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-03T06:37:47.253Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| declaration / app task queue | 482 | 685 | 42.6% | 36.3% | 45.2% | 3.8% | higher time in every pair, beyond control spread |
| task / initialized emulator request | 992 | 1368 | 39.3% | 39.3% | 38.9% | 4.5% | higher time in every pair, beyond control spread |
| parameter / validation specification | 120 | 238 | 100.2% | 101.1% | 98.3% | 1.8% | higher time in every pair, beyond control spread |
| logger / formatted status | 579 | 564 | -3.3% | -4.3% | -3.2% | 7.4% | unestablished at this precision |
| logger / structured request | 247 | 255 | 3.8% | 2.3% | 3.8% | 3.9% | unestablished at this precision |
| logger / nested data | 7066 | 3797 | -46.7% | -47.1% | -46.7% | 1.2% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 64 | 71 | 10.2% | 10.2% | 9.8% | 2.4% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 391 | 488 | 24.8% | 23.8% | 25.5% | 8.3% | higher time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 38352 | 38537 | 0.8% | 0.9% | 0.5% | 5% | unestablished at this precision |
| request / initialized HTTP handler | 262 | 260 | -1% | -3% | 1.5% | 0.9% | unestablished at this precision |
| callable / encode structured payload | 1261 | 880 | -30.2% | -31.6% | -27% | 25.9% | unestablished at this precision |
| callable / decode structured payload | 1313 | 875 | -33.3% | -34.9% | -31.7% | 0.7% | lower time in every pair, beyond control spread |
| request / callable without token headers | 1713 | 1830 | 6.8% | 6.8% | 8.8% | 3.8% | unestablished at this precision |
| trace / portable header extraction | 187 | 149 | -20.1% | -19.3% | -20.1% | 3.8% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 177 | 139 | -21.2% | -21.2% | -20% | 0.5% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 13394 | 13822 | 2.3% | 5.6% | 0.8% | 2.2% | unestablished at this precision |
| secret / runtime string read | 5 | 5 | -1.6% | -0.8% | -6% | 1.7% | unestablished at this precision |
| declaration / Firestore written trigger | 528 | 766 | 44.6% | 49.1% | 38.7% | 4% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 2613 | 1465 | -44% | -42.9% | -48.2% | 3.2% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vfirebase-functions/bench/results/node-isolated.json node packages/vfirebase-functions/bench/compare.cjs
OUTPUT=packages/vfirebase-functions/bench/results/bun-isolated.json bun packages/vfirebase-functions/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vfirebase-functions results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
