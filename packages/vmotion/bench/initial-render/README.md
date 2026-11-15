# vmotion measurements

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

Recorded 2026-11-15T05:31:22.513Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Motion14 fade SSR | 22392 | 17237 | -23% | -15.8% | -24.6% | 1.7% | lower time in every pair, beyond control spread |
| Motion14 variants SSR | 25269 | 19300 | -23.6% | -23.6% | -24% | 2.8% | lower time in every pair, beyond control spread |
| Motion14 initial-false SSR | 22422 | 16706 | -25.5% | -24.8% | -26.1% | 4.3% | lower time in every pair, beyond control spread |
| App12 fade SSR | 21687 | 16812 | -23.4% | -24.3% | -22.6% | 1.2% | lower time in every pair, beyond control spread |
| App12 variants SSR | 25337 | 18889 | -26.1% | -42.2% | -25.3% | 2.4% | lower time in every pair, beyond control spread |
| App12 initial-false SSR | 22065 | 16251 | -26.3% | -26.8% | -26.3% | 1.9% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-15T05:31:47.257Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Motion14 fade SSR | 21157 | 13146 | -37.9% | -39.2% | -35.7% | 5.8% | lower time in every pair, beyond control spread |
| Motion14 variants SSR | 23850 | 15976 | -32.9% | -33.3% | -32.9% | 2.8% | lower time in every pair, beyond control spread |
| Motion14 initial-false SSR | 20498 | 12866 | -37.2% | -39.5% | -35.2% | 4.5% | lower time in every pair, beyond control spread |
| App12 fade SSR | 20294 | 13683 | -33.1% | -33.4% | -32.1% | 3% | lower time in every pair, beyond control spread |
| App12 variants SSR | 23334 | 16548 | -28.7% | -28.7% | -29.8% | 3.2% | lower time in every pair, beyond control spread |
| App12 initial-false SSR | 19832 | 13117 | -33.8% | -34.3% | -33.8% | 4.9% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vmotion/bench/initial-render/node-isolated.json node packages/vmotion/bench/compare.cjs
OUTPUT=packages/vmotion/bench/initial-render/bun-isolated.json bun packages/vmotion/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vmotion initial-render compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
