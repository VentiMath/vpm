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

Recorded 2026-11-01T16:53:58.891Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 483 | 345 | -28.2% | -29% | -28% | 1.4% | lower time in every pair, beyond control spread |
| logger / structured request | 578 | 591 | 2.2% | 2% | 2.5% | 1.9% | unestablished at this precision |
| logger / nested data | 6243 | 4152 | -33.5% | -32.2% | -34.9% | 3% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 49 | 56 | 15.7% | 16.8% | 14.7% | 2.9% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 941 | 762 | -18.3% | -18.3% | -16.1% | 4% | lower time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 46975 | 52628 | 11.6% | 11.6% | 12.2% | 31.1% | unestablished at this precision |
| request / initialized HTTP handler | 225 | 211 | -6.3% | -5.4% | -31.9% | 3% | lower time in every pair, beyond control spread |
| callable / encode structured payload | 855 | 1197 | 40.1% | 42.3% | 29.1% | 6.3% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1050 | 1214 | 15% | 15.7% | 13.2% | 8.8% | higher time in every pair, beyond control spread |
| request / callable without token headers | 2068 | 2348 | 14.8% | 14.8% | 16.3% | 4.6% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 260 | 210 | -19.2% | -19.4% | -18.9% | 7.2% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 244 | 214 | -12.6% | -22.5% | -12.6% | 2.1% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 11709 | 22196 | 89.5% | 95.6% | 87.8% | 3.4% | higher time in every pair, beyond control spread |
| secret / runtime string read | 452 | 454 | -0.9% | 0.2% | -0.9% | 5% | unestablished at this precision |
| declaration / Firestore written trigger | 847 | 928 | 9.7% | 9.7% | 9.7% | 9.2% | unestablished at this precision |
| event / materialize changed protobuf documents | 3225 | 1750 | -45.7% | -45.9% | -45.7% | 1.8% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T16:55:03.883Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 572 | 554 | -3% | -3.1% | -3% | 29.5% | unestablished at this precision |
| logger / structured request | 247 | 249 | 0.6% | 6.4% | -4.6% | 5.9% | unestablished at this precision |
| logger / nested data | 7195 | 3795 | -47.1% | -47.1% | -50.3% | 3.8% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 62 | 69 | 11.8% | 12.4% | 6.1% | 7.2% | unestablished at this precision |
| declaration / HTTP endpoint | 391 | 479 | 24.7% | 24.7% | 60.6% | 6.9% | higher time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 38788 | 44119 | 15.2% | 17.5% | 11.5% | 2.3% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 263 | 243 | -5.4% | -5.4% | 28.2% | 3.4% | unestablished at this precision |
| callable / encode structured payload | 1257 | 924 | -26.3% | -26.3% | -30% | 3.2% | lower time in every pair, beyond control spread |
| callable / decode structured payload | 1375 | 867 | -36.9% | -36.9% | -36.2% | 2.4% | lower time in every pair, beyond control spread |
| request / callable without token headers | 1758 | 1981 | 13.4% | 12.8% | 13.4% | 20.3% | unestablished at this precision |
| trace / portable header extraction | 189 | 153 | -18.2% | -18.9% | -16.7% | 8.7% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 181 | 174 | -3.1% | -12.2% | 11.8% | 3.8% | unestablished at this precision |
| discovery / 64 grouped endpoints | 13823 | 13902 | 1.6% | 0.5% | 1.9% | 4.5% | unestablished at this precision |
| secret / runtime string read | 3 | 2 | -18.8% | -40.2% | 16.6% | 395.6% | unestablished at this precision |
| declaration / Firestore written trigger | 550 | 760 | 38% | 36.2% | 58.4% | 9.2% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 2655 | 1629 | -38.5% | -38.5% | -39.8% | 4.6% | lower time in every pair, beyond control spread |

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
