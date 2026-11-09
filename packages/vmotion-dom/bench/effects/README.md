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

Recorded 2026-11-09T20:38:46.658Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind, paint and dispose opacity/width/scale | 2514 | 3699 | 39.5% | 58.6% | 15.5% | 73.3% | unestablished at this precision |
| update one opacity binding | 122 | 115 | -5.7% | -5.4% | -8.3% | 28.7% | unestablished at this precision |
| compose three changing transforms | 327 | 209 | -36.1% | -36.1% | -36.3% | 14.7% | lower time in every pair, beyond control spread |
| publish opacity to 32 elements | 2463 | 1818 | -25.5% | -19.2% | -25.5% | 4.8% | lower time in every pair, beyond control spread |
| update SVG path length and offset | 360 | 446 | 23.7% | 25.6% | 23.7% | 39.6% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-09T20:38:22.093Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind, paint and dispose opacity/width/scale | 2238 | 2668 | 23.3% | 23.3% | 21.6% | 49.9% | unestablished at this precision |
| update one opacity binding | 80 | 79 | -1.3% | 5.2% | -2% | 28.4% | unestablished at this precision |
| compose three changing transforms | 189 | 171 | -9.2% | -9.2% | -9.1% | 34.5% | unestablished at this precision |
| publish opacity to 32 elements | 1757 | 1679 | -4.5% | 16.7% | -13.9% | 9.6% | unestablished at this precision |
| update SVG path length and offset | 230 | 273 | 19% | 19.2% | 15.3% | 7.1% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/effects.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/effects/node-isolated.json node packages/vmotion-dom/bench/effects.cjs
OUTPUT=packages/vmotion-dom/bench/effects/bun-isolated.json bun packages/vmotion-dom/bench/effects.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom effects effects.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
