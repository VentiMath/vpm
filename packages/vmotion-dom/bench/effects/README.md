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

Recorded 2026-11-09T20:20:40.822Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind, paint and dispose opacity/width/scale | 1834 | 3899 | 112.8% | 32.2% | 189.9% | 4.3% | unestablished at this precision |
| update one opacity binding | 117 | 113 | -2.2% | -13.1% | 4.8% | 5.8% | unestablished at this precision |
| compose three changing transforms | 316 | 325 | 1.6% | 1.5% | 4.4% | 6.4% | unestablished at this precision |
| publish opacity to 32 elements | 2536 | 1807 | -28.8% | -30% | -28.8% | 6.3% | lower time in every pair, beyond control spread |
| update SVG path length and offset | 354 | 487 | 28.9% | 19.3% | 60.7% | 6% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T20:21:03.386Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind, paint and dispose opacity/width/scale | 2189 | 2808 | 25.5% | 11% | 38% | 12.5% | unestablished at this precision |
| update one opacity binding | 81 | 130 | 61.7% | 71% | 58.3% | 14.8% | higher time in every pair, beyond control spread |
| compose three changing transforms | 172 | 344 | 104.2% | 95.3% | 113.1% | 31% | higher time in every pair, beyond control spread |
| publish opacity to 32 elements | 1718 | 3559 | 107.3% | 88.2% | 128.1% | 9.5% | higher time in every pair, beyond control spread |
| update SVG path length and offset | 230 | 336 | 48% | 41.2% | 50.3% | 20.3% | higher time in every pair, beyond control spread |

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
