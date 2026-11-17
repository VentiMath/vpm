# vclassnames measurements

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

Recorded 2026-11-17T11:36:45.570Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Redoc operation classes | 36 | 50 | 38.7% | 35.1% | 44.3% | 5.2% | higher time in every pair, beyond control spread |
| conditional nested classes | 103 | 112 | 8.2% | 7.1% | 9.8% | 4% | higher time in every pair, beyond control spread |
| CSS module binding | 75 | 108 | 44.1% | 42.1% | 46.2% | 3% | higher time in every pair, beyond control spread |
| deduplicated state classes | 343 | 432 | 26.4% | 27.9% | 23.4% | 1.7% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-17T11:37:01.504Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Redoc operation classes | 23 | 23 | -3.6% | 28% | -30.6% | 8.7% | unestablished at this precision |
| conditional nested classes | 97 | 82 | -14.9% | -19.2% | -14.8% | 6.6% | lower time in every pair, beyond control spread |
| CSS module binding | 44 | 49 | 11% | 13.2% | 9.1% | 13.3% | unestablished at this precision |
| deduplicated state classes | 131 | 134 | 2.5% | 6.6% | -2% | 5.8% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vclassnames/bench/results/node-isolated.json node packages/vclassnames/bench/compare.cjs
OUTPUT=packages/vclassnames/bench/results/bun-isolated.json bun packages/vclassnames/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vclassnames results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
