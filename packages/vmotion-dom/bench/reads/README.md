# vmotion-dom measurements

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

Recorded 2026-11-09T22:02:29.310Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| read three components of one matrix | 1241 | 39 | -96.8% | -97.5% | -96.8% | 0.9% | lower time in every pair, beyond control spread |
| read changing transform matrices | 427 | 417 | -2.3% | -18.7% | -1.1% | 2.5% | unestablished at this precision |
| read computed opacity | 13 | 24 | 84.1% | 70.2% | 98% | 12.8% | higher time in every pair, beyond control spread |
| resolve current numeric keyframe and wildcards | 38 | 52 | 34.2% | 28.7% | 34.2% | 3.2% | higher time in every pair, beyond control spread |
| resolve DOM start and CSS variable endpoint | 962 | 521 | -46% | -46% | -45.9% | 2.2% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T22:01:57.304Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| read three components of one matrix | 590 | 51 | -91.2% | -92.1% | -89.8% | 6.7% | lower time in every pair, beyond control spread |
| read changing transform matrices | 429 | 496 | 12.3% | 12.3% | 20.3% | 36.4% | unestablished at this precision |
| read computed opacity | 11 | 17 | 35% | 35% | 48.6% | 29.5% | unestablished at this precision |
| resolve current numeric keyframe and wildcards | 86 | 130 | 53.7% | 146.5% | 53.7% | 10.3% | unestablished at this precision |
| resolve DOM start and CSS variable endpoint | 1043 | 1165 | 12% | -4.6% | 47.4% | 59.1% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/reads.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/reads/node-isolated.json node packages/vmotion-dom/bench/reads.cjs
OUTPUT=packages/vmotion-dom/bench/reads/bun-isolated.json bun packages/vmotion-dom/bench/reads.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom reads reads.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
