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

Recorded 2026-11-09T21:28:12.451Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| read three components of one matrix | 1250 | 38 | -97% | -97% | -96.9% | 4.1% | lower time in every pair, beyond control spread |
| read changing transform matrices | 411 | 393 | -4.6% | -3.3% | -5.4% | 2.8% | unestablished at this precision |
| read computed opacity | 11 | 23 | 105.4% | 113.2% | 105.4% | 4.1% | higher time in every pair, beyond control spread |
| resolve current numeric keyframe and wildcards | 36 | 49 | 36.2% | 35.4% | 36.2% | 0.7% | higher time in every pair, beyond control spread |
| resolve DOM start and CSS variable endpoint | 928 | 737 | -20.7% | -15.9% | -24.6% | 2.4% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T21:28:36.213Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| read three components of one matrix | 308 | 30 | -90.1% | -89.7% | -90.1% | 5.4% | lower time in every pair, beyond control spread |
| read changing transform matrices | 232 | 279 | 20.1% | 12% | 23.9% | 15.9% | unestablished at this precision |
| read computed opacity | 7 | 9 | 27.1% | 40.4% | 27.1% | 1.3% | higher time in every pair, beyond control spread |
| resolve current numeric keyframe and wildcards | 48 | 59 | 23.6% | 22.4% | 24.3% | 9.1% | higher time in every pair, beyond control spread |
| resolve DOM start and CSS variable endpoint | 607 | 783 | 29% | 29% | 39.3% | 6.2% | higher time in every pair, beyond control spread |

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
