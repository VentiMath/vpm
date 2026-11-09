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

Recorded 2026-11-09T20:22:50.620Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| opacity mapping | 9 | 7 | -25.4% | -21.4% | -29.3% | 9% | lower time in every pair, beyond control spread |
| 128-keyframe timeline lookup | 47 | 14 | -71.1% | -70.9% | -71.4% | 8.6% | lower time in every pair, beyond control spread |
| prepare 16-keyframe timeline | 365 | 69 | -81% | -81% | -81% | 4% | lower time in every pair, beyond control spread |
| 20-item centered stagger | 158 | 70 | -55.8% | -59.7% | -55.6% | 37.8% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T20:23:10.629Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| opacity mapping | 9 | 2 | -83.4% | -84.5% | -82.4% | 3.4% | lower time in every pair, beyond control spread |
| 128-keyframe timeline lookup | 51 | 11 | -77.4% | -71.7% | -77.4% | 20.9% | lower time in every pair, beyond control spread |
| prepare 16-keyframe timeline | 159 | 86 | -41.3% | 24.9% | -41.3% | 18.7% | unestablished at this precision |
| 20-item centered stagger | 82 | 87 | 6.1% | -23.4% | 42.4% | 6% | unestablished at this precision |

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
