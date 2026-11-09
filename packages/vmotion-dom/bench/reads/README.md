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

Recorded 2026-11-09T21:12:13.143Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| read three components of one matrix | 1181 | 39 | -96.7% | -96.8% | -96.2% | 2.8% | lower time in every pair, beyond control spread |
| read changing transform matrices | 410 | 400 | -4.1% | -4.4% | -1.8% | 2% | unestablished at this precision |
| read computed opacity | 15 | 24 | 62% | 105% | 52.3% | 5.6% | higher time in every pair, beyond control spread |
| resolve current numeric keyframe and wildcards | 37 | 51 | 39.2% | 39.2% | 42.9% | 1.5% | higher time in every pair, beyond control spread |
| resolve DOM start and CSS variable endpoint | 855 | 846 | -6.1% | -12.3% | -6.1% | 2.5% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-09T21:12:36.013Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| read three components of one matrix | 302 | 30 | -90.1% | -89.8% | -90.4% | 0.4% | lower time in every pair, beyond control spread |
| read changing transform matrices | 228 | 276 | 21.9% | 22% | 21.9% | 5.1% | higher time in every pair, beyond control spread |
| read computed opacity | 7 | 9 | 24.4% | 22.9% | 25% | 2.7% | higher time in every pair, beyond control spread |
| resolve current numeric keyframe and wildcards | 47 | 58 | 23% | 24.7% | 23% | 14% | higher time in every pair, beyond control spread |
| resolve DOM start and CSS variable endpoint | 599 | 764 | 27.3% | 21% | 36.7% | 6.9% | higher time in every pair, beyond control spread |

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
