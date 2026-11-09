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

Recorded 2026-11-09T21:42:39.513Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| read three components of one matrix | 1258 | 45 | -96.4% | -96.7% | -96.2% | 11.9% | lower time in every pair, beyond control spread |
| read changing transform matrices | 435 | 416 | -5.6% | -13.6% | 2.4% | 1.4% | unestablished at this precision |
| read computed opacity | 16 | 25 | 51% | 50.6% | 87.7% | 25.8% | higher time in every pair, beyond control spread |
| resolve current numeric keyframe and wildcards | 39 | 52 | 31.5% | 1.1% | 61.9% | 6.5% | unestablished at this precision |
| resolve DOM start and CSS variable endpoint | 908 | 589 | -36.7% | -36.6% | -36.7% | 1.9% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T21:41:49.535Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| read three components of one matrix | 332 | 30 | -91% | -90.6% | -91.5% | 4.4% | lower time in every pair, beyond control spread |
| read changing transform matrices | 242 | 290 | 20.9% | 10.6% | 26.7% | 18.2% | unestablished at this precision |
| read computed opacity | 7 | 9 | 30.2% | 5% | 31.5% | 23.1% | unestablished at this precision |
| resolve current numeric keyframe and wildcards | 51 | 68 | 26.6% | 26.6% | 28.3% | 2.3% | higher time in every pair, beyond control spread |
| resolve DOM start and CSS variable endpoint | 646 | 635 | -2.6% | -5.8% | 0.2% | 6.1% | unestablished at this precision |

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
