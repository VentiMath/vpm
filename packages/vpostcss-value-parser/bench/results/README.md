# vpostcss-value-parser measurements

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

Recorded 2026-11-17T23:27:27.812Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| short shorthand parse | 187 | 187 | 1% | -3.7% | 3.3% | 123.1% | unestablished at this precision |
| nested CSS value parse | 787 | 889 | 14% | 28.2% | -13.4% | 311.4% | unestablished at this precision |
| parse walk and serialize | 613 | 757 | 24.2% | 32.4% | 24.2% | 69.3% | unestablished at this precision |
| dimension decomposition | 26 | 46 | 74.9% | 79.4% | 65.7% | 57.9% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-17T23:27:57.775Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| short shorthand parse | 172 | 164 | -0.8% | -40.4% | 1.4% | 8.2% | unestablished at this precision |
| nested CSS value parse | 629 | 779 | 22.1% | -31% | 23.8% | 3.7% | unestablished at this precision |
| parse walk and serialize | 448 | 606 | 34.2% | -11.9% | 40.7% | 7.8% | unestablished at this precision |
| dimension decomposition | 32 | 22 | -31.1% | -50.6% | -28.3% | 4.3% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vpostcss-value-parser/bench/results/node-isolated.json node packages/vpostcss-value-parser/bench/compare.cjs
OUTPUT=packages/vpostcss-value-parser/bench/results/bun-isolated.json bun packages/vpostcss-value-parser/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vpostcss-value-parser results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
