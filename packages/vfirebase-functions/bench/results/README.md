# vfirebase-functions measurements

These records supersede the earlier same-process comparison. Each timed
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

Recorded 2026-11-01T11:54:16.520Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 478 | 343 | -28.7% | -28.7% | -27% | 1.4% | lower time in every pair, beyond control spread |
| logger / structured request | 566 | 585 | 3.3% | 3.4% | 3.3% | 1.4% | higher time in every pair, beyond control spread |
| logger / nested data | 6398 | 4100 | -36.5% | -35.9% | -36.5% | 3.6% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 49 | 56 | 15.1% | 14.3% | 16% | 67.8% | unestablished at this precision |
| declaration / HTTP endpoint | 971 | 793 | -18.1% | -15.8% | -21% | 14.8% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 48331 | 54349 | 15.3% | -5.1% | 27.1% | 2.4% | unestablished at this precision |
| request / initialized HTTP handler | 233 | 212 | -9% | -9.5% | -9% | 13.5% | unestablished at this precision |
| callable / encode structured payload | 859 | 1199 | 39.4% | 40.4% | 38.6% | 1.7% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1048 | 1207 | 15.6% | 16% | 13.9% | 2.5% | higher time in every pair, beyond control spread |
| request / callable without token headers | 2097 | 2386 | 10.7% | 2.9% | 16.6% | 23% | unestablished at this precision |
| trace / portable header extraction | 256 | 208 | -18.6% | -14.8% | -21.9% | 1.5% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 244 | 216 | -11.5% | -4.1% | -15% | 2.2% | unestablished at this precision |
| discovery / 64 grouped endpoints | 11671 | 22241 | 89.8% | 90.8% | 89.8% | 11.8% | higher time in every pair, beyond control spread |
| secret / runtime string read | 455 | 454 | 0.4% | 0.8% | -1.7% | 4% | unestablished at this precision |
| declaration / Firestore written trigger | 842 | 918 | 8.5% | 8.5% | 9.4% | 2.2% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 3129 | 1710 | -45.4% | -45.4% | -45% | 2.1% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T11:55:20.816Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 565 | 553 | -2% | -4.2% | -0.2% | 3.3% | unestablished at this precision |
| logger / structured request | 239 | 246 | 2.8% | 5.2% | 1% | 9.1% | unestablished at this precision |
| logger / nested data | 7171 | 3716 | -48% | -49.7% | -46.6% | 236.7% | unestablished at this precision |
| initializer / already initialized handler | 61 | 69 | 12.8% | 12.8% | 16.5% | 21.3% | unestablished at this precision |
| declaration / HTTP endpoint | 389 | 479 | 23.2% | 18.2% | 26.3% | 31.2% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 37504 | 38468 | 2% | 1.6% | 44.8% | 15.6% | unestablished at this precision |
| request / initialized HTTP handler | 257 | 243 | -5.4% | -11.4% | -1.8% | 0.6% | unestablished at this precision |
| callable / encode structured payload | 1262 | 906 | -27.9% | -32.5% | -27% | 1.4% | lower time in every pair, beyond control spread |
| callable / decode structured payload | 1350 | 864 | -36.1% | -36.4% | -35.9% | 7.5% | lower time in every pair, beyond control spread |
| request / callable without token headers | 1712 | 1979 | 15.6% | 22.8% | 15.1% | 4.5% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 185 | 153 | -17% | -18.5% | -14.9% | 5.5% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 179 | 159 | -10.4% | -8.5% | -11% | 9.9% | unestablished at this precision |
| discovery / 64 grouped endpoints | 13458 | 13936 | 3.3% | 6.2% | 0.6% | 4.5% | unestablished at this precision |
| secret / runtime string read | 3 | 2 | -21.1% | -40.8% | -1.7% | 62.9% | unestablished at this precision |
| declaration / Firestore written trigger | 541 | 819 | 55.4% | 33.3% | 55.8% | 2.9% | unestablished at this precision |
| event / materialize changed protobuf documents | 2570 | 1587 | -38.2% | -42.7% | -37% | 2.2% | lower time in every pair, beyond control spread |

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
