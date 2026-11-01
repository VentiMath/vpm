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

Recorded 2026-11-01T11:28:09.410Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 473 | 343 | -28.1% | -27.2% | -28.7% | 0.5% | lower time in every pair, beyond control spread |
| logger / structured request | 572 | 588 | 2.9% | 3.1% | 2.8% | 0.2% | higher time in every pair, beyond control spread |
| logger / nested data | 6306 | 4094 | -35.5% | -35.6% | -34.9% | 0.3% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 49 | 57 | 16.7% | 15.7% | 16.7% | 10.9% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 978 | 802 | -16.4% | -19.5% | -11.6% | 24.7% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 49346 | 64330 | 13.9% | 77.2% | 12.4% | 4.6% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 222 | 213 | -4.1% | 9.2% | -10.4% | 1.2% | unestablished at this precision |
| callable / encode structured payload | 846 | 1195 | 40.6% | 45.7% | 37.9% | 4% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1034 | 1226 | 17.6% | 17.3% | 21.4% | 1% | higher time in every pair, beyond control spread |
| request / callable without token headers | 2048 | 2437 | 19.2% | 18.7% | 19.2% | 3.2% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 256 | 208 | -18.8% | -19% | 12.5% | 0.8% | unestablished at this precision |
| trace / legacy decimal span extraction | 241 | 216 | -10.5% | -10.5% | -8.2% | 1.6% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 11781 | 23148 | 96% | 96% | 95.2% | 2.8% | higher time in every pair, beyond control spread |
| secret / runtime string read | 458 | 453 | -0.5% | -1.6% | 3.7% | 3.3% | unestablished at this precision |
| declaration / Firestore written trigger | 843 | 945 | 11.8% | 9% | 16% | 0.5% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 3136 | 1755 | -44% | -42.1% | -44% | 1.5% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T11:29:15.122Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 582 | 557 | -3.9% | -4.7% | 6.5% | 1.3% | unestablished at this precision |
| logger / structured request | 243 | 250 | 3.2% | 3.3% | 1.8% | 0.5% | unestablished at this precision |
| logger / nested data | 6874 | 3845 | -44.9% | -44.4% | -44.9% | 12.9% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 61 | 67 | 9.6% | 7.2% | 16.3% | 3.4% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 387 | 470 | 20.9% | -11.9% | 26.4% | 0.6% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 38171 | 45058 | 19.4% | 16.7% | 21.6% | 1.4% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 263 | 244 | -7.7% | -8.2% | -6.9% | 24.7% | unestablished at this precision |
| callable / encode structured payload | 1227 | 922 | -24.7% | -26% | -19.2% | 19.7% | unestablished at this precision |
| callable / decode structured payload | 1326 | 862 | -35.2% | -38.9% | -34.6% | 1.6% | lower time in every pair, beyond control spread |
| request / callable without token headers | 1729 | 1976 | 14.6% | 13.3% | 15.5% | 8.6% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 187 | 152 | -18.6% | -18.6% | -11.1% | 15.5% | unestablished at this precision |
| trace / legacy decimal span extraction | 177 | 158 | -10.6% | -10.6% | -10.7% | 4.7% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 14001 | 14161 | 3.6% | 2.5% | 3.6% | 1.3% | unestablished at this precision |
| secret / runtime string read | 3 | 3 | -20.8% | -43.1% | -3.2% | 139.6% | unestablished at this precision |
| declaration / Firestore written trigger | 538 | 759 | 41.4% | 40.5% | 41.5% | 5.2% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 2608 | 1593 | -38.4% | -36.8% | -38.9% | 0.9% | lower time in every pair, beyond control spread |

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
