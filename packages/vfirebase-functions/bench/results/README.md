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

Recorded 2026-11-01T10:12:46.305Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 488 | 363 | -26.3% | -25.5% | -26.3% | 3% | lower time in every pair, beyond control spread |
| logger / structured request | 588 | 624 | 5.6% | 7.5% | 5.6% | 1.4% | higher time in every pair, beyond control spread |
| logger / nested data | 6628 | 4291 | -35.2% | -36.6% | -35.2% | 6.2% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 51 | 58 | 14.2% | -18.2% | 14.6% | 4.4% | unestablished at this precision |
| declaration / HTTP endpoint | 945 | 818 | -13.3% | -4.6% | -23% | 1.4% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 48806 | 55305 | 14.8% | 11.5% | 16.6% | 6.3% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 238 | 234 | -1.7% | -1.7% | -3.5% | 6.4% | unestablished at this precision |
| callable / encode structured payload | 873 | 1248 | 46.5% | 50.7% | 43.2% | 3.2% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1093 | 1263 | 16.3% | 14.8% | 18.7% | 6% | higher time in every pair, beyond control spread |
| request / callable without token headers | 2101 | 2378 | 15.3% | 22.1% | 9.9% | 5.5% | higher time in every pair, beyond control spread |
| secret / runtime string read | 469 | 479 | 0.7% | 2.1% | -1.5% | 1.3% | unestablished at this precision |
| declaration / Firestore written trigger | 874 | 946 | 9.3% | 9.3% | 7.1% | 5.3% | unestablished at this precision |
| event / materialize changed protobuf documents | 3295 | 1810 | -45.1% | -43.2% | -46.4% | 5.8% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T10:13:38.387Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 628 | 567 | -10% | -10.7% | -3.3% | 2.5% | unestablished at this precision |
| logger / structured request | 256 | 265 | -1.7% | 6.1% | -7% | 4.7% | unestablished at this precision |
| logger / nested data | 7736 | 3859 | -48.4% | -50.3% | -44.7% | 6.3% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 68 | 72 | 5% | -1.1% | 16.2% | 3.2% | unestablished at this precision |
| declaration / HTTP endpoint | 444 | 523 | 15.6% | 12.8% | 19.4% | 10.8% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 38445 | 40268 | 1.7% | 0.5% | 47.5% | 3.8% | unestablished at this precision |
| request / initialized HTTP handler | 281 | 302 | 9.4% | 1.2% | 17.5% | 5.4% | unestablished at this precision |
| callable / encode structured payload | 1344 | 996 | -25.9% | -27.4% | -25.9% | 6.1% | lower time in every pair, beyond control spread |
| callable / decode structured payload | 1420 | 936 | -33.1% | -35.1% | -24.3% | 10.1% | lower time in every pair, beyond control spread |
| request / callable without token headers | 1896 | 2221 | 18.6% | 15.5% | 24.8% | 14.7% | higher time in every pair, beyond control spread |
| secret / runtime string read | 3 | 3 | 16.3% | 16.3% | 8.7% | 39.6% | unestablished at this precision |
| declaration / Firestore written trigger | 564 | 871 | 51.2% | 161.6% | 51.2% | 0.7% | higher time in every pair, beyond control spread |
| event / materialize changed protobuf documents | 2471 | 2156 | -15.2% | 3.5% | -17.1% | 3% | unestablished at this precision |

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
