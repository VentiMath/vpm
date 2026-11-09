# vmotion-dom before/after measurements

The “Upstream” columns in this report are the previous VPM implementation at
`88dea27fb126f03403478d582828a37db51d2af1`, reconstructed from Git history by
`baseline.cjs`. They are not upstream Motion. This isolates the cost of this change.

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

Recorded 2026-11-09T20:50:43.105Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind, paint and dispose opacity/width/scale | 3762 | 3575 | 3.7% | 3.7% | 12.8% | 35.5% | unestablished at this precision |
| update one opacity binding | 114 | 117 | 3.5% | 11.3% | -1.8% | 2.9% | unestablished at this precision |
| compose three changing transforms | 332 | 202 | -39.2% | -36.5% | -39.9% | 1.3% | lower time in every pair, beyond control spread |
| publish opacity to 32 elements | 1807 | 1828 | 0.5% | 6.6% | -0.9% | 2.3% | unestablished at this precision |
| update SVG path length and offset | 439 | 436 | -0.2% | -1.1% | 0.9% | 4.1% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-09T20:51:07.601Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind, paint and dispose opacity/width/scale | 2848 | 2579 | -9.5% | -4.4% | -21.7% | 8.1% | unestablished at this precision |
| update one opacity binding | 132 | 83 | -37.9% | -38.1% | -37.7% | 2.8% | lower time in every pair, beyond control spread |
| compose three changing transforms | 351 | 174 | -51.6% | -53.2% | -50% | 3.5% | lower time in every pair, beyond control spread |
| publish opacity to 32 elements | 3636 | 1736 | -52.2% | -57% | -50.4% | 12.2% | lower time in every pair, beyond control spread |
| update SVG path length and offset | 336 | 284 | -13.8% | -21.8% | -13.1% | 30.6% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/effects.cjs:

```sh
VMOTION_DOM_BENCH_PREVIOUS=1 OUTPUT=packages/vmotion-dom/bench/effects-previous/node-isolated.json node packages/vmotion-dom/bench/effects.cjs
VMOTION_DOM_BENCH_PREVIOUS=1 OUTPUT=packages/vmotion-dom/bench/effects-previous/bun-isolated.json bun packages/vmotion-dom/bench/effects.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom effects-previous effects.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
