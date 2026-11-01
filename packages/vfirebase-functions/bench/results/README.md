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

Recorded 2026-11-01T09:46:58.851Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 475 | 342 | -27.7% | -27.7% | -27.9% | 2.9% | lower time in every pair, beyond control spread |
| logger / structured request | 563 | 590 | 5.2% | 8.8% | 0.9% | 9% | unestablished at this precision |
| logger / nested data | 6267 | 4054 | -35.8% | -34.6% | -36.3% | 3.5% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 48 | 56 | 14.8% | 18.6% | 13.3% | 2.6% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 850 | 746 | -13.4% | -13.4% | -5.4% | 19.5% | unestablished at this precision |
| declaration / serialize 64 fresh endpoints | 47160 | 53146 | 13.9% | 19.2% | 9.8% | 0.9% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 225 | 223 | -0.5% | -1% | -0.5% | 35.7% | unestablished at this precision |
| callable / encode structured payload | 846 | 1187 | 40.4% | 40.4% | 43.6% | 1.7% | higher time in every pair, beyond control spread |
| callable / decode structured payload | 1053 | 1198 | 13.7% | -14.2% | 14.9% | 2.6% | unestablished at this precision |
| request / callable without token headers | 2048 | 2468 | 18.9% | 18.2% | 20.5% | 4.6% | higher time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T09:47:39.432Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 580 | 556 | -3.7% | -4% | -1% | 6.9% | unestablished at this precision |
| logger / structured request | 243 | 245 | 1.5% | 3% | 0.2% | 4% | unestablished at this precision |
| logger / nested data | 7135 | 3712 | -46.7% | -43.9% | -48.3% | 3.4% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 63 | 69 | 9.8% | 5.5% | 11.8% | 9.3% | unestablished at this precision |
| declaration / HTTP endpoint | 384 | 478 | 25.9% | 25.9% | 26.7% | 5.8% | higher time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 38114 | 38625 | 0.6% | 0.6% | 3.6% | 6.2% | unestablished at this precision |
| request / initialized HTTP handler | 257 | 271 | 5.2% | 6.8% | -10.6% | 1.5% | unestablished at this precision |
| callable / encode structured payload | 1249 | 942 | -26.9% | -26.9% | -27.7% | 35.1% | unestablished at this precision |
| callable / decode structured payload | 1345 | 870 | -35.4% | -35.3% | -37.7% | 1.4% | lower time in every pair, beyond control spread |
| request / callable without token headers | 1727 | 1986 | 12.1% | 15.4% | 8.2% | 3.6% | higher time in every pair, beyond control spread |

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
