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

Recorded 2026-11-01T16:41:51.702Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 480 | 342 | -28.4% | -28.8% | -28.2% | 3.2% | lower time in every pair, beyond control spread |
| logger / structured request | 570 | 588 | 3.5% | 3.5% | 2.8% | 1.3% | unestablished at this precision |
| logger / nested data | 6257 | 4122 | -34.1% | -33.1% | -35% | 11% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 49 | 56 | 14.5% | 14.5% | 14.2% | 3.7% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 973 | 810 | -14.8% | -20% | 8.2% | 4.2% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 47175 | 53320 | 13% | 9.9% | 14.4% | 35.3% | unestablished at this precision |
| request / initialized HTTP handler | 223 | 211 | -5.5% | -7.4% | -5.5% | 5.7% | unestablished at this precision |
| callable / encode structured payload | 854 | 1207 | 41.4% | 42.6% | 40.5% | 1.9% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1043 | 1211 | 15.7% | 16.5% | 15.1% | 1.4% | higher time in every pair, beyond control spread |
| request / callable without token headers | 2061 | 2339 | 13.5% | 15.9% | 11% | 9.6% | unestablished at this precision |
| trace / portable header extraction | 256 | 210 | -17.8% | -32.9% | -14.9% | 7.5% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 243 | 216 | -10.9% | -12.3% | -10.9% | 6.5% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 11906 | 22330 | 87.1% | 87.1% | 86.4% | 11.2% | higher time in every pair, beyond control spread |
| secret / runtime string read | 457 | 462 | 2% | 0.4% | 2% | 6.1% | unestablished at this precision |
| declaration / Firestore written trigger | 849 | 928 | 9.3% | 10.4% | 9.3% | 4.9% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 3147 | 1743 | -44.8% | -42.8% | -45.4% | 6% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T16:42:56.730Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 572 | 557 | -2.6% | 2.6% | -2.6% | 6.3% | unestablished at this precision |
| logger / structured request | 242 | 242 | -0.3% | -0.1% | -0.3% | 0.4% | unestablished at this precision |
| logger / nested data | 7307 | 3752 | -48.7% | -46.5% | -49.8% | 3.6% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 62 | 69 | 10.4% | 7.7% | 11.7% | 2.3% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 391 | 479 | 25.1% | 14.2% | 31.1% | 0.8% | higher time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 37941 | 44245 | 16.5% | 15.5% | 17.7% | 1.7% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 261 | 247 | -5.1% | -4.5% | -5.1% | 1.8% | lower time in every pair, beyond control spread |
| callable / encode structured payload | 1257 | 909 | -27.2% | -29.5% | -26.8% | 3.9% | lower time in every pair, beyond control spread |
| callable / decode structured payload | 1337 | 860 | -35.9% | -36.4% | -34.8% | 2.4% | lower time in every pair, beyond control spread |
| request / callable without token headers | 2737 | 1994 | -16.6% | 14% | -49% | 0.7% | unestablished at this precision |
| trace / portable header extraction | 192 | 159 | -18.6% | -17.6% | -26.7% | 15.7% | unestablished at this precision |
| trace / legacy decimal span extraction | 184 | 161 | -10.3% | -10.3% | -9.8% | 1% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 13920 | 13881 | -0.9% | -1.7% | 2.1% | 3.8% | unestablished at this precision |
| secret / runtime string read | 3 | 2 | -21% | -39.5% | 20.3% | 169.1% | unestablished at this precision |
| declaration / Firestore written trigger | 538 | 772 | 43.7% | 43.1% | 43.7% | 3.2% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 2618 | 1586 | -39.7% | -39.7% | -40.3% | 4% | lower time in every pair, beyond control spread |

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
