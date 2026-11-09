# vdiff measurements

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

Recorded 2026-11-09T16:00:31.338Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| short problem wording | 3878 | 1691 | -56.5% | -56.5% | -55.9% | 2.6% | lower time in every pair, beyond control spread |
| contest statement with TeX | 5223 | 2636 | -49.7% | -49.7% | -49.5% | 6.1% | lower time in every pair, beyond control spread |
| long single-word correction | 234179 | 117503 | -49.7% | -50.1% | -48.9% | 1.6% | lower time in every pair, beyond control spread |
| unchanged problem | 2586 | 672 | -73.9% | -74.5% | -73.9% | 3.8% | lower time in every pair, beyond control spread |
| space-aware edit | 6832 | 3085 | -54.8% | -54.5% | -55% | 3.1% | lower time in every pair, beyond control spread |
| disjoint word replacement | 10704979 | 35027 | -99.7% | -99.7% | -99.7% | 0.2% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T16:04:12.703Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| short problem wording | 3178 | 1398 | -56% | -53.6% | -56% | 7.9% | lower time in every pair, beyond control spread |
| contest statement with TeX | 4628 | 2660 | -42.4% | -38.1% | -42.4% | 9.9% | lower time in every pair, beyond control spread |
| long single-word correction | 290526 | 121367 | -58% | -57.5% | -58.2% | 5.7% | lower time in every pair, beyond control spread |
| unchanged problem | 3086 | 606 | -80.5% | -79.3% | -81.6% | 11.1% | lower time in every pair, beyond control spread |
| space-aware edit | 3876 | 2709 | -30.1% | -31% | -29.6% | 1.8% | lower time in every pair, beyond control spread |
| disjoint word replacement | 14127960 | 40216 | -99.7% | -99.8% | -99.7% | 7.1% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vdiff/bench/results/node-isolated.json node packages/vdiff/bench/compare.cjs
OUTPUT=packages/vdiff/bench/results/bun-isolated.json bun packages/vdiff/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vdiff results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
