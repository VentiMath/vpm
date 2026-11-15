# vmotion measurements

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

Recorded 2026-11-15T03:20:30.323Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Motion14 fade SSR | 22796 | 24459 | 6.8% | 6.8% | 8.4% | 2.3% | higher time in every pair, beyond control spread |
| Motion14 variants SSR | 25816 | 26179 | 2.2% | 4.8% | -1.2% | 3.2% | unestablished at this precision |
| Motion14 initial-false SSR | 22432 | 23273 | 3.9% | 4.2% | 3.2% | 3.1% | unestablished at this precision |
| App12 fade SSR | 21735 | 23362 | 6.9% | 6.9% | 9.3% | 1.7% | higher time in every pair, beyond control spread |
| App12 variants SSR | 25758 | 25719 | -0.6% | -1% | 0.7% | 4.1% | unestablished at this precision |
| App12 initial-false SSR | 22732 | 22878 | 0.7% | -9.1% | 1.4% | 3% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-15T03:20:54.742Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Motion14 fade SSR | 21588 | 18947 | -12.5% | -11.1% | -12.9% | 5.3% | lower time in every pair, beyond control spread |
| Motion14 variants SSR | 24140 | 21367 | -11.8% | -11.8% | -11.9% | 4.6% | lower time in every pair, beyond control spread |
| Motion14 initial-false SSR | 20719 | 18197 | -12.1% | -12.7% | -12.1% | 3.8% | lower time in every pair, beyond control spread |
| App12 fade SSR | 20691 | 19176 | -7.3% | -5.1% | -7.5% | 3.7% | unestablished at this precision |
| App12 variants SSR | 23090 | 21730 | -5.9% | -7.2% | -5% | 1.9% | lower time in every pair, beyond control spread |
| App12 initial-false SSR | 19963 | 18477 | -7.4% | -9.8% | -6.7% | 5.1% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vmotion/bench/root-lifecycle/node-isolated.json node packages/vmotion/bench/compare.cjs
OUTPUT=packages/vmotion/bench/root-lifecycle/bun-isolated.json bun packages/vmotion/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vmotion root-lifecycle compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
