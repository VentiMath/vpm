# vmotion-dom measurements

Each timed
implementation runs alone in a fresh process. Four comparison pairs use
balanced before-first / VPM-first order; two further pairs run identical
before code in separate processes as controls. Warmup lasts at least 150 ms
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

Recorded 2026-11-09T22:33:20.536Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Before ns | VPM ns | Change | Before first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, seek and release an element fade | 5674 | 3402 | -35.6% | -43.4% | -29.5% | 27.8% | unestablished at this precision |
| resolve, seek and release a variable width animation | 6715 | 4796 | -31.9% | -25.2% | -31.9% | 19.1% | unestablished at this precision |
| seek and paint sixteen element transforms | 3634 | 3530 | -5.1% | -6% | -1.6% | 2.7% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-09T22:33:37.610Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Before ns | VPM ns | Change | Before first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, seek and release an element fade | 2490 | 1950 | -21.4% | -21.1% | -22.2% | 6.1% | lower time in every pair, beyond control spread |
| resolve, seek and release a variable width animation | 6571 | 5422 | -18.9% | -23.2% | -17.5% | 29.6% | unestablished at this precision |
| seek and paint sixteen element transforms | 3074 | 2999 | -2.9% | -2.3% | -3% | 5.1% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/elements.cjs:

```sh
VMOTION_ELEMENT_PREVIOUS=1 OUTPUT=packages/vmotion-dom/bench/elements-previous/node-isolated.json node packages/vmotion-dom/bench/elements.cjs
VMOTION_ELEMENT_PREVIOUS=1 OUTPUT=packages/vmotion-dom/bench/elements-previous/bun-isolated.json bun packages/vmotion-dom/bench/elements.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom elements-previous elements.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.

The control is immutable VPM commit `5182639e6750dad8188cc3d35837e4236a2e963a`, reconstructed from Git history, not upstream Motion. The same creation/seek/release and sixteen-controller workloads run on both variants. Source and process samples are retained even where direction is inconclusive.
