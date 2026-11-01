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

Recorded 2026-11-01T13:50:49.483Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 480 | 345 | -28.3% | -25.5% | -29.6% | 1.7% | lower time in every pair, beyond control spread |
| logger / structured request | 570 | 594 | 4.4% | 8.5% | 2.6% | 0.3% | unestablished at this precision |
| logger / nested data | 6224 | 4161 | -33.1% | -31.8% | -34.4% | 1.5% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 48 | 56 | 15.1% | 16.6% | 15.1% | 0.9% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 944 | 848 | -9.8% | -10.1% | 8.7% | 4.8% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 46821 | 53203 | 13.5% | 9.7% | 40% | 3.6% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 223 | 212 | -5.1% | -5.9% | -5.1% | 4.2% | unestablished at this precision |
| callable / encode structured payload | 848 | 1209 | 42.9% | 42.3% | 43% | 0.5% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1039 | 1233 | 18.1% | 18.2% | 17.9% | 1.1% | higher time in every pair, beyond control spread |
| request / callable without token headers | 2135 | 2495 | 16.8% | 17.8% | 14.7% | 3.8% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 256 | 209 | -18.8% | -18.4% | -18.8% | 9.3% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 243 | 216 | -11.5% | -13% | -11.5% | 7.8% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 11885 | 22478 | 87.9% | 90.4% | 83.3% | 1.8% | higher time in every pair, beyond control spread |
| secret / runtime string read | 454 | 453 | 0% | -1.6% | 1.3% | 3.6% | unestablished at this precision |
| declaration / Firestore written trigger | 852 | 942 | 10.7% | 10.2% | 11.1% | 1.2% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 3200 | 1739 | -45.6% | -56.5% | -45.6% | 5.4% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T13:51:54.952Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 599 | 567 | -3.2% | -27.3% | -3.2% | 8.4% | unestablished at this precision |
| logger / structured request | 247 | 249 | 0.9% | 0.9% | 1.1% | 1.5% | unestablished at this precision |
| logger / nested data | 7138 | 3758 | -46.8% | -49.6% | -45.3% | 5% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 62 | 68 | 9.4% | 9.6% | 9.4% | 7% | unestablished at this precision |
| declaration / HTTP endpoint | 392 | 480 | 23.6% | 18.6% | 29.6% | 6.8% | higher time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 37940 | 44792 | 18.7% | 24.5% | 14.4% | 2.8% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 256 | 246 | -4% | -7.6% | -3.9% | 6.3% | unestablished at this precision |
| callable / encode structured payload | 1253 | 917 | -27.1% | -27.1% | -26.2% | 4.7% | lower time in every pair, beyond control spread |
| callable / decode structured payload | 1370 | 880 | -35.6% | -35.6% | -35.7% | 2.1% | lower time in every pair, beyond control spread |
| request / callable without token headers | 1752 | 1990 | 13.5% | 16.4% | 12.7% | 2.6% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 190 | 152 | -19.9% | -16.7% | -19.9% | 13.8% | unestablished at this precision |
| trace / legacy decimal span extraction | 179 | 171 | -4.4% | -9.3% | 2.3% | 3.5% | unestablished at this precision |
| discovery / 64 grouped endpoints | 13909 | 14007 | 0.3% | -0.3% | 3.7% | 0.9% | unestablished at this precision |
| secret / runtime string read | 4 | 3 | -23.2% | -48.7% | 2.6% | 63.1% | unestablished at this precision |
| declaration / Firestore written trigger | 556 | 799 | 44.2% | 56.5% | 35.5% | 29.6% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 2721 | 1719 | -36.8% | -13.9% | -58.5% | 1.6% | unestablished at this precision |

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
