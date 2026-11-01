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

Recorded 2026-11-01T13:35:38.077Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 479 | 341 | -29.2% | -28.5% | -29.7% | 2.9% | lower time in every pair, beyond control spread |
| logger / structured request | 573 | 590 | 2.9% | 2.5% | 3% | 1.9% | unestablished at this precision |
| logger / nested data | 6369 | 4135 | -35.5% | -34.8% | -51% | 7.6% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 49 | 56 | 14.1% | 15.7% | 11.8% | 0.9% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 937 | 816 | -14.8% | -17.4% | -7.3% | 3.7% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 46914 | 52564 | 12% | -6.6% | 12% | 0.5% | unestablished at this precision |
| request / initialized HTTP handler | 225 | 213 | -5% | -5% | -5.6% | 0.9% | lower time in every pair, beyond control spread |
| callable / encode structured payload | 852 | 1206 | 40.2% | 43.2% | 39.7% | 0.6% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1042 | 1207 | 15.8% | 16% | 15.8% | 2.7% | higher time in every pair, beyond control spread |
| request / callable without token headers | 2014 | 2251 | 11.8% | 14.4% | 11.8% | 2.4% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 256 | 207 | -19% | -16.6% | -20% | 2.1% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 241 | 216 | -10.7% | -8.7% | -11.1% | 2.3% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 11608 | 22273 | 89.7% | 99.9% | 86.9% | 4.5% | higher time in every pair, beyond control spread |
| secret / runtime string read | 470 | 452 | -3.6% | 2% | -8.2% | 6.1% | unestablished at this precision |
| declaration / Firestore written trigger | 839 | 932 | 10.5% | 11% | 9.8% | 0.9% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 3165 | 1733 | -44.9% | -45.1% | -44.9% | 1.7% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T13:36:41.326Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 572 | 550 | -3.8% | -4.1% | -3.8% | 2.6% | unestablished at this precision |
| logger / structured request | 242 | 245 | 1.4% | -4.6% | 3.6% | 1.1% | unestablished at this precision |
| logger / nested data | 7346 | 3694 | -49.7% | -52.9% | -47.3% | 3.2% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 62 | 68 | 9.4% | 9.1% | 10% | 8.5% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 381 | 536 | 39.7% | 21.6% | 223.5% | 1.6% | higher time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 38774 | 44515 | 17.6% | 16.5% | 40.9% | 1% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 267 | 252 | -6.1% | -7.9% | -3.2% | 3.9% | unestablished at this precision |
| callable / encode structured payload | 1248 | 928 | -25.6% | -25.3% | -25.6% | 2% | lower time in every pair, beyond control spread |
| callable / decode structured payload | 1328 | 872 | -34.8% | -36.2% | -34% | 1.7% | lower time in every pair, beyond control spread |
| request / callable without token headers | 1779 | 1967 | 12.7% | 10.1% | 12.7% | 1.7% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 202 | 159 | -22.5% | -21.6% | -22.5% | 3.6% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 178 | 162 | -8.6% | -12.9% | -6.1% | 4.8% | unestablished at this precision |
| discovery / 64 grouped endpoints | 13558 | 13825 | 1.7% | 3.4% | 1.7% | 2.5% | unestablished at this precision |
| secret / runtime string read | 2 | 2 | -0.2% | -21.6% | 61.1% | 134.6% | unestablished at this precision |
| declaration / Firestore written trigger | 544 | 743 | 34.9% | 38.1% | 33.8% | 5.8% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 2583 | 1561 | -39.6% | -40.8% | -37.2% | 4% | lower time in every pair, beyond control spread |

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
