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

Recorded 2026-11-01T14:12:48.381Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 483 | 346 | -28.3% | -28.5% | -28.1% | 3.8% | lower time in every pair, beyond control spread |
| logger / structured request | 577 | 594 | 3.6% | 3.6% | 2.7% | 2.3% | unestablished at this precision |
| logger / nested data | 6364 | 4133 | -34.7% | -36.4% | -33.6% | 0.4% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 49 | 57 | 15.4% | 13.7% | 16.6% | 0.9% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 966 | 813 | -13.5% | -5.2% | -13.5% | 27% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 47667 | 53503 | 13.6% | 12.3% | 13.8% | 2.8% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 226 | 212 | -6.3% | -6.5% | -5.9% | 1.7% | lower time in every pair, beyond control spread |
| callable / encode structured payload | 854 | 1204 | 41.4% | 38.8% | 43.4% | 1.1% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1044 | 1237 | 18.5% | 18.5% | 24% | 0.4% | higher time in every pair, beyond control spread |
| request / callable without token headers | 2119 | 2496 | 17.6% | 27.5% | 17.6% | 4% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 257 | 213 | -17.3% | -17.2% | -17.3% | 0.7% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 246 | 217 | -12.2% | -12.8% | -10.5% | 2.2% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 11809 | 22617 | 93.9% | 81.2% | 96.5% | 1.4% | higher time in every pair, beyond control spread |
| secret / runtime string read | 457 | 456 | -1.5% | -1.5% | -2% | 2.1% | unestablished at this precision |
| declaration / Firestore written trigger | 850 | 945 | 11.4% | 11.5% | 11.1% | 9.3% | unestablished at this precision |
| event / materialize changed protobuf documents | 3221 | 1738 | -45.8% | -46% | -45.8% | 4.5% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T14:13:55.010Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 583 | 567 | -1.3% | 0.5% | -4% | 6.3% | unestablished at this precision |
| logger / structured request | 250 | 245 | -0.2% | -0.5% | -0.2% | 5.3% | unestablished at this precision |
| logger / nested data | 7441 | 3749 | -49.5% | -52.8% | -47.9% | 6.9% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 65 | 69 | 6.4% | -32.9% | 10.9% | 6.3% | unestablished at this precision |
| declaration / HTTP endpoint | 382 | 478 | 25.2% | -0.7% | 30.6% | 5% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 38415 | 44775 | 17.3% | 12.1% | 17.5% | 6.7% | unestablished at this precision |
| request / initialized HTTP handler | 270 | 247 | -8.6% | -30.5% | -8.4% | 11.5% | unestablished at this precision |
| callable / encode structured payload | 1284 | 919 | -28.1% | -28.9% | -27.8% | 1.3% | lower time in every pair, beyond control spread |
| callable / decode structured payload | 1366 | 859 | -36.9% | -38.7% | -34.4% | 13% | lower time in every pair, beyond control spread |
| request / callable without token headers | 1766 | 1944 | 12.1% | 6.3% | 12.1% | 4.5% | unestablished at this precision |
| trace / portable header extraction | 205 | 156 | -24.1% | -19% | -27.3% | 16% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 180 | 160 | -10.9% | -10.9% | -11.2% | 5.4% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 13913 | 14001 | 0.9% | -10.8% | 0.9% | 3.2% | unestablished at this precision |
| secret / runtime string read | 3 | 3 | -0.4% | -26.9% | 5.4% | 173.3% | unestablished at this precision |
| declaration / Firestore written trigger | 559 | 758 | 39.6% | -13.5% | 39.6% | 5.5% | unestablished at this precision |
| event / materialize changed protobuf documents | 2682 | 1613 | -39% | -43.7% | -35.5% | 7.3% | lower time in every pair, beyond control spread |

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
