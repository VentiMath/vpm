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

Recorded 2026-11-17T17:55:37.375Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Redoc operation classes | 37 | 32 | -14% | -12.1% | -16.9% | 3.7% | lower time in every pair, beyond control spread |
| conditional nested classes | 103 | 97 | -5.8% | -4.9% | -5.8% | 2.7% | unestablished at this precision |
| CSS module binding | 76 | 81 | 6.9% | 4.8% | 6.9% | 3.2% | unestablished at this precision |
| deduplicated state classes | 337 | 362 | 6.2% | 12.1% | 3.6% | 4.3% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-17T17:55:53.252Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Redoc operation classes | 23 | 16 | -29.9% | -29.9% | -29.9% | 0.7% | lower time in every pair, beyond control spread |
| conditional nested classes | 96 | 54 | -43.5% | -44.4% | -43.5% | 1.5% | lower time in every pair, beyond control spread |
| CSS module binding | 44 | 32 | -25.9% | -23.3% | -28.8% | 12.4% | lower time in every pair, beyond control spread |
| deduplicated state classes | 128 | 105 | -17.6% | -12.2% | -21.5% | 7.6% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vclassnames/bench/optimized/node-isolated.json node packages/vclassnames/bench/compare.cjs
OUTPUT=packages/vclassnames/bench/optimized/bun-isolated.json bun packages/vclassnames/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vclassnames optimized compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
