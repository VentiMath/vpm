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

Recorded 2026-11-01T18:56:33.417Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 571 | 413 | -28% | -27.1% | -30.5% | 22.8% | lower time in every pair, beyond control spread |
| logger / structured request | 681 | 706 | 3.8% | 7.2% | 3.1% | 4.6% | unestablished at this precision |
| logger / nested data | 7534 | 4912 | -35.1% | -18.9% | -35.1% | 29.6% | unestablished at this precision |
| initializer / already initialized handler | 58 | 67 | 15.6% | 21.5% | 14.5% | 15.1% | unestablished at this precision |
| declaration / HTTP endpoint | 1205 | 992 | -20% | -11.5% | -24.8% | 2.9% | lower time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 56180 | 63330 | 13.1% | 13.6% | 11.2% | 3.3% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 267 | 249 | -6.4% | -5.9% | -8% | 1.2% | lower time in every pair, beyond control spread |
| callable / encode structured payload | 1004 | 1428 | 41.7% | 43.4% | 35.1% | 0.9% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1248 | 1459 | 17.1% | 17.1% | 17.7% | 1.7% | higher time in every pair, beyond control spread |
| request / callable without token headers | 2491 | 2926 | 19.3% | 21% | 10.6% | 1.4% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 305 | 248 | -18.7% | -18.7% | -18.9% | 1.3% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 289 | 258 | -10.9% | -11.3% | -9.9% | 5.5% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 13957 | 27016 | 90.1% | 91.6% | 90.1% | 3.4% | higher time in every pair, beyond control spread |
| secret / runtime string read | 549 | 547 | -1% | -1.2% | -0.6% | 4.6% | unestablished at this precision |
| declaration / Firestore written trigger | 1011 | 1110 | 9.7% | 9.7% | 15% | 3.9% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 3789 | 2059 | -45.6% | -44.4% | -45.6% | 13% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T18:57:46.158Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 692 | 677 | -1.1% | -1.5% | 7.2% | 1.3% | unestablished at this precision |
| logger / structured request | 293 | 299 | -2% | 11.5% | -9.5% | 1.5% | unestablished at this precision |
| logger / nested data | 8589 | 4750 | -44.9% | -26.7% | -44.9% | 9.1% | unestablished at this precision |
| initializer / already initialized handler | 77 | 84 | 7.7% | 32.8% | 2.7% | 5.2% | unestablished at this precision |
| declaration / HTTP endpoint | 478 | 606 | 20.1% | 50.4% | 10.6% | 12.5% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 47124 | 72910 | 48.3% | 72.5% | 42% | 2.7% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 291 | 306 | 2% | -1.4% | 154.7% | 3.5% | unestablished at this precision |
| callable / encode structured payload | 1528 | 1176 | -20.8% | -23.6% | 11.8% | 3.1% | unestablished at this precision |
| callable / decode structured payload | 1576 | 1235 | -20.4% | -25% | 185.7% | 3.3% | unestablished at this precision |
| request / callable without token headers | 2067 | 2462 | 19.8% | 17.8% | 58.8% | 2.4% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 221 | 185 | -16.7% | -12.4% | -16.7% | 5.3% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 210 | 209 | 0% | 8.6% | -6.5% | 4.8% | unestablished at this precision |
| discovery / 64 grouped endpoints | 16109 | 17787 | 10.4% | 11% | 8.9% | 2.6% | unestablished at this precision |
| secret / runtime string read | 4 | 3 | -23.7% | -35% | -11.7% | 86.8% | unestablished at this precision |
| declaration / Firestore written trigger | 657 | 966 | 47.8% | 51.2% | 45.9% | 5.2% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 3097 | 1920 | -38% | -38.8% | -38% | 5.8% | lower time in every pair, beyond control spread |

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
