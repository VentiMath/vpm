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

Recorded 2026-11-09T20:49:56.129Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind, paint and dispose opacity/width/scale | 2266 | 3257 | 71% | 71% | 79.7% | 38.6% | unestablished at this precision |
| update one opacity binding | 118 | 113 | -1.9% | -18.4% | 8.9% | 25.6% | unestablished at this precision |
| compose three changing transforms | 313 | 202 | -35.3% | -35.3% | -35.2% | 5.5% | lower time in every pair, beyond control spread |
| publish opacity to 32 elements | 2710 | 1797 | -33.4% | -42.5% | -28.3% | 20.7% | lower time in every pair, beyond control spread |
| update SVG path length and offset | 372 | 425 | 17.7% | 13.4% | 19.3% | 9.9% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-09T20:50:18.448Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind, paint and dispose opacity/width/scale | 2318 | 2621 | 22% | -6.8% | 39.4% | 7.7% | unestablished at this precision |
| update one opacity binding | 87 | 80 | -8.1% | -8.1% | -6.4% | 9.4% | unestablished at this precision |
| compose three changing transforms | 195 | 178 | -9% | -25.8% | -6.4% | 33.1% | unestablished at this precision |
| publish opacity to 32 elements | 1799 | 1781 | -2.3% | -5.3% | -1.1% | 8.3% | unestablished at this precision |
| update SVG path length and offset | 229 | 274 | 21.6% | 48.7% | 16% | 14.6% | unestablished at this precision |

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
