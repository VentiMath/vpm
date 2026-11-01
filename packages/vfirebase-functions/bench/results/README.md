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

Recorded 2026-11-01T10:20:39.589Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 503 | 358 | -29.5% | -29.5% | -29.2% | 4.8% | lower time in every pair, beyond control spread |
| logger / structured request | 585 | 612 | 5.2% | 4.2% | 6% | 2.5% | higher time in every pair, beyond control spread |
| logger / nested data | 6607 | 4205 | -36.9% | -37% | -35.5% | 2.9% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 51 | 59 | 15.5% | 16.3% | 15.5% | 4.1% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 928 | 832 | -11.3% | -12.3% | -7.7% | 2.7% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 48827 | 64765 | 18.3% | 16.2% | 32.8% | 3.6% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 237 | 219 | -7.3% | -7.3% | -7.6% | 3.4% | lower time in every pair, beyond control spread |
| callable / encode structured payload | 891 | 1243 | 39.5% | 39.5% | 39.5% | 3.5% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1084 | 1259 | 15.6% | 14.8% | 17.4% | 8% | higher time in every pair, beyond control spread |
| request / callable without token headers | 2211 | 2468 | 11.9% | 14.5% | 11.9% | 2.8% | higher time in every pair, beyond control spread |
| trace / portable header extraction | 273 | 217 | -20.4% | -20.4% | -22.6% | 4.3% | lower time in every pair, beyond control spread |
| trace / legacy decimal span extraction | 257 | 222 | -13.6% | -10.2% | -18.2% | 5.7% | lower time in every pair, beyond control spread |
| discovery / 64 grouped endpoints | 12072 | 23283 | 93.5% | 93.1% | 94% | 1.7% | higher time in every pair, beyond control spread |
| secret / runtime string read | 470 | 473 | 0.2% | 0.2% | 0.8% | 2.1% | unestablished at this precision |
| declaration / Firestore written trigger | 876 | 964 | 10% | 9.3% | 10.6% | 4% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 3335 | 1799 | -46.3% | -46.7% | -9.1% | 3.6% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T10:21:45.110Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 617 | 602 | -2.3% | -2.3% | 2.9% | 1.7% | unestablished at this precision |
| logger / structured request | 257 | 265 | 2% | 3.7% | 0.8% | 7.6% | unestablished at this precision |
| logger / nested data | 7648 | 3956 | -49.2% | -47.8% | -49.4% | 8.9% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 69 | 76 | 8.5% | 5.6% | 13.1% | 22.4% | unestablished at this precision |
| declaration / HTTP endpoint | 417 | 528 | 26.9% | 22.4% | 31.6% | 12.4% | higher time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 40107 | 40163 | -0.3% | 0.7% | -1.5% | 1.4% | unestablished at this precision |
| request / initialized HTTP handler | 273 | 272 | -0.9% | 0.6% | -5.5% | 10.3% | unestablished at this precision |
| callable / encode structured payload | 1313 | 989 | -25.3% | -25.3% | -26.3% | 7.1% | lower time in every pair, beyond control spread |
| callable / decode structured payload | 1425 | 914 | -37.2% | -37.8% | -37.2% | 5.4% | lower time in every pair, beyond control spread |
| request / callable without token headers | 1884 | 2128 | 8.8% | 13.3% | -6.4% | 5.8% | unestablished at this precision |
| trace / portable header extraction | 197 | 162 | -17.7% | 61.9% | -20.1% | 5.2% | unestablished at this precision |
| trace / legacy decimal span extraction | 186 | 176 | -6.6% | 42.6% | -6.9% | 39.5% | unestablished at this precision |
| discovery / 64 grouped endpoints | 14138 | 14550 | 4.7% | 12.8% | 3.9% | 9% | unestablished at this precision |
| secret / runtime string read | 3 | 3 | 2.6% | -1.5% | 2.6% | 65% | unestablished at this precision |
| declaration / Firestore written trigger | 573 | 832 | 45.2% | 53.9% | 34.3% | 2.2% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 2682 | 1685 | -36.9% | -39% | -36.6% | 4.8% | lower time in every pair, beyond control spread |

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
