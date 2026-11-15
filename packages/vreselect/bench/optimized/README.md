# vreselect measurements

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

Recorded 2026-11-15T18:57:39.395Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| current lru-hit | 6 | 5 | -25.2% | -19.6% | -33.4% | 11% | lower time in every pair, beyond control spread |
| current lru-miss | 21 | 20 | -6.2% | -2.2% | -10.8% | 2.2% | unestablished at this precision |
| current weak-hit | 20 | 21 | 1.8% | 8.1% | -3.2% | 7.2% | unestablished at this precision |
| current selector-hit | 19 | 16 | -19% | -13.6% | -27% | 8.8% | lower time in every pair, beyond control spread |
| current changed-state | 306 | 325 | 6.6% | 6.6% | 6.6% | 40% | unestablished at this precision |
| current mui-selector | 35 | 37 | 4.6% | 8.9% | -1.1% | 4.1% | unestablished at this precision |
| app lru-hit | 8 | 9 | 14.6% | 22.3% | 6.4% | 10.9% | unestablished at this precision |
| app lru-miss | 21 | 20 | -7% | -4% | -9.2% | 4.5% | unestablished at this precision |
| app weak-hit | 19 | 26 | 36.4% | 43.4% | 24.5% | 168.3% | unestablished at this precision |
| app selector-hit | 15 | 17 | 9.3% | 16% | 2.1% | 7.9% | unestablished at this precision |
| app changed-state | 520 | 374 | -26.1% | -30.7% | -23.4% | 22.4% | unestablished at this precision |
| app mui-selector | 34 | 41 | 23.8% | 17.8% | 23.8% | 7.7% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-15T18:58:26.739Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| current lru-hit | 18 | 10 | -48.9% | -48.9% | -39.3% | 22.8% | unestablished at this precision |
| current lru-miss | 38 | 23 | -30.4% | -28.4% | -39.8% | 32% | unestablished at this precision |
| current weak-hit | 8 | 9 | 7.1% | 9.1% | -10% | 11.3% | unestablished at this precision |
| current selector-hit | 8 | 8 | 5% | 16.6% | -12.2% | 44.1% | unestablished at this precision |
| current changed-state | 137 | 83 | -33.6% | -27.2% | -38.3% | 22.7% | unestablished at this precision |
| current mui-selector | 32 | 27 | -11.4% | 5.8% | -37.4% | 52.8% | unestablished at this precision |
| app lru-hit | 23 | 20 | -2.7% | 25.2% | -32.4% | 40.2% | unestablished at this precision |
| app lru-miss | 43 | 37 | -9.4% | -9.4% | -15% | 28.2% | unestablished at this precision |
| app weak-hit | 21 | 27 | 31.5% | 34% | 22.3% | 36.1% | unestablished at this precision |
| app selector-hit | 16 | 16 | -5.3% | 35.3% | -17.3% | 36.5% | unestablished at this precision |
| app changed-state | 166 | 153 | -7.9% | -9.4% | -7.9% | 19.9% | unestablished at this precision |
| app mui-selector | 34 | 39 | 26.2% | 63.6% | 5.2% | 38% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vreselect/bench/optimized/node-isolated.json node packages/vreselect/bench/compare.cjs
OUTPUT=packages/vreselect/bench/optimized/bun-isolated.json bun packages/vreselect/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vreselect optimized compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
