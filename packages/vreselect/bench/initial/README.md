Historical first implementation measurements. The runtime has since changed; these retained samples describe the earlier source hashes, not current performance.

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

Recorded 2026-11-15T18:20:15.176Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| current lru-hit | 6 | 4 | -38.9% | -38.4% | -42.3% | 9.4% | lower time in every pair, beyond control spread |
| current lru-miss | 21 | 45 | 109.6% | 119.8% | 105.3% | 7.9% | higher time in every pair, beyond control spread |
| current weak-hit | 19 | 42 | 122.9% | 125.4% | 120% | 5.9% | higher time in every pair, beyond control spread |
| current selector-hit | 19 | 27 | 43% | 41% | 44.1% | 5.4% | higher time in every pair, beyond control spread |
| current changed-state | 328 | 323 | -7.4% | -0.3% | -14.3% | 27.9% | unestablished at this precision |
| current mui-selector | 35 | 55 | 51.6% | 56.3% | 51.6% | 6.5% | higher time in every pair, beyond control spread |
| app lru-hit | 8 | 10 | 20% | 27.1% | 19.3% | 5.3% | higher time in every pair, beyond control spread |
| app lru-miss | 21 | 44 | 110.9% | 115.8% | 110.9% | 2.1% | higher time in every pair, beyond control spread |
| app weak-hit | 19 | 45 | 137.4% | 134.4% | 137.4% | 4.7% | higher time in every pair, beyond control spread |
| app selector-hit | 15 | 27 | 78.8% | 81.2% | 78.4% | 5.6% | higher time in every pair, beyond control spread |
| app changed-state | 600 | 295 | -50.6% | -62.9% | -38.5% | 6.1% | lower time in every pair, beyond control spread |
| app mui-selector | 36 | 60 | 74.3% | 59.2% | 79% | 3.6% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-15T18:21:02.825Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| current lru-hit | 15 | 9 | -40.7% | -36.3% | -42.9% | 4.5% | lower time in every pair, beyond control spread |
| current lru-miss | 27 | 26 | -5.4% | -5.5% | -1.9% | 7.1% | unestablished at this precision |
| current weak-hit | 8 | 11 | 35.9% | 38.7% | 34.8% | 13.3% | higher time in every pair, beyond control spread |
| current selector-hit | 6 | 10 | 54.6% | 55.2% | 54% | 8.9% | higher time in every pair, beyond control spread |
| current changed-state | 131 | 136 | 4.1% | 7.1% | 0.2% | 5.4% | unestablished at this precision |
| current mui-selector | 30 | 41 | 42.3% | 58.7% | 25.7% | 26.6% | unestablished at this precision |
| app lru-hit | 18 | 18 | 4.3% | 36.1% | -26.6% | 29.9% | unestablished at this precision |
| app lru-miss | 34 | 37 | 7% | 7.8% | 6.8% | 4.9% | higher time in every pair, beyond control spread |
| app weak-hit | 20 | 24 | 15.6% | 17.8% | 6.2% | 1% | unestablished at this precision |
| app selector-hit | 12 | 18 | 52% | 85.9% | 17.9% | 2.3% | higher time in every pair, beyond control spread |
| app changed-state | 111 | 138 | 24.7% | -15.5% | 24.7% | 1.8% | unestablished at this precision |
| app mui-selector | 34 | 36 | 12.5% | -1.5% | 13.3% | 7.7% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vreselect/bench/results/node-isolated.json node packages/vreselect/bench/compare.cjs
OUTPUT=packages/vreselect/bench/results/bun-isolated.json bun packages/vreselect/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vreselect results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
