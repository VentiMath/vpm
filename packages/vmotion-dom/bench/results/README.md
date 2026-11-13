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

Recorded 2026-11-13T09:40:23.238Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| opacity mapping | 9 | 7 | -25.4% | -18.8% | -29.8% | 6.9% | lower time in every pair, beyond control spread |
| 128-keyframe timeline lookup | 48 | 14 | -71.3% | -71.3% | -71.1% | 1.2% | lower time in every pair, beyond control spread |
| prepare 16-keyframe timeline | 362 | 79 | -78.3% | -63.5% | -78.3% | 0.4% | lower time in every pair, beyond control spread |
| 20-item centered stagger | 157 | 71 | -55% | -55.1% | -54.9% | 0.7% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-13T09:40:40.657Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| opacity mapping | 8 | 1 | -83.9% | -86.2% | -83.9% | 3.1% | lower time in every pair, beyond control spread |
| 128-keyframe timeline lookup | 51 | 10 | -79.6% | -82.4% | -79.6% | 5.3% | lower time in every pair, beyond control spread |
| prepare 16-keyframe timeline | 161 | 81 | -47.2% | -44.8% | -51.9% | 14.3% | lower time in every pair, beyond control spread |
| 20-item centered stagger | 80 | 87 | 8% | 10.3% | 6.5% | 3.1% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/results/node-isolated.json node packages/vmotion-dom/bench/compare.cjs
OUTPUT=packages/vmotion-dom/bench/results/bun-isolated.json bun packages/vmotion-dom/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
