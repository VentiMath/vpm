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

Recorded 2026-11-01T15:19:27.272Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 480 | 349 | -27.3% | -26.6% | -27.3% | 1.7% | lower time in every pair, beyond control spread |
| logger / structured request | 567 | 593 | 4.8% | 4.4% | 5.5% | 1.1% | higher time in every pair, beyond control spread |
| logger / nested data | 6408 | 4127 | -36% | -36.4% | -35.4% | 3.2% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 48 | 56 | 14.6% | 14.7% | 14.6% | 5.2% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 988 | 820 | -16.3% | -16.3% | -14.9% | 70.5% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 47166 | 54273 | 12.9% | 15.6% | -11.8% | 27.9% | unestablished at this precision |
| request / initialized HTTP handler | 223 | 213 | -4.2% | -3.5% | -9.3% | 3.5% | unestablished at this precision |
| callable / encode structured payload | 856 | 1196 | 42.1% | 42.6% | 38% | 1.5% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1065 | 1215 | 14.8% | 15.6% | 13.8% | 1.8% | higher time in every pair, beyond control spread |
| request / callable without token headers | 2071 | 2442 | 18.1% | -10.9% | 21.2% | 2.3% | unestablished at this precision |
| trace / portable header extraction | 256 | 209 | -17.7% | -17.2% | -20.3% | 0.7% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 246 | 215 | -12.5% | -12.1% | -12.7% | 2.8% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 11877 | 22181 | 86.8% | 83.6% | 92.4% | 2.4% | higher time in every pair, beyond control spread |
| secret / runtime string read | 450 | 459 | 0.5% | 0.5% | 13.3% | 2.9% | unestablished at this precision |
| declaration / Firestore written trigger | 853 | 930 | 9.1% | 7.7% | 10.3% | 3.9% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 3172 | 1729 | -45.5% | -46% | -45.5% | 3.1% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T15:20:31.728Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 571 | 560 | -2.9% | -3.4% | -2.8% | 11.6% | unestablished at this precision |
| logger / structured request | 242 | 246 | 2.6% | -1.8% | 7.1% | 3.3% | unestablished at this precision |
| logger / nested data | 7126 | 3759 | -47.5% | -47.5% | -47.1% | 9.1% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 62 | 68 | 8.9% | 10.1% | 7.3% | 73.3% | unestablished at this precision |
| declaration / HTTP endpoint | 385 | 480 | 24.5% | 24.5% | 22.2% | 29.6% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 38158 | 43879 | 16.2% | 16.2% | 19.7% | 72.9% | unestablished at this precision |
| request / initialized HTTP handler | 262 | 250 | -3.3% | -6.6% | 6.3% | 4.4% | unestablished at this precision |
| callable / encode structured payload | 1249 | 909 | -27.1% | -27.1% | -27% | 7.5% | lower time in every pair, beyond control spread |
| callable / decode structured payload | 1348 | 874 | -34.9% | -36% | -34.2% | 15.7% | lower time in every pair, beyond control spread |
| request / callable without token headers | 1753 | 1940 | 10.7% | 11.7% | 9.3% | 2.9% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 191 | 154 | -19.8% | -21.4% | -16.5% | 10.6% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 177 | 161 | -9.3% | -10.7% | -2.7% | 2.8% | unestablished at this precision |
| discovery / 64 grouped endpoints | 13891 | 13812 | -0.6% | -4.2% | 2.4% | 1.3% | unestablished at this precision |
| secret / runtime string read | 3 | 3 | -18.2% | -43.7% | 27.4% | 64.2% | unestablished at this precision |
| declaration / Firestore written trigger | 543 | 776 | 41% | 43.9% | 41% | 14.5% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 2588 | 1620 | -37.6% | -38.4% | -37% | 8.9% | lower time in every pair, beyond control spread |

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
