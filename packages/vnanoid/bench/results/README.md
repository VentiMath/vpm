# vnanoid measurements

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

Recorded 2026-11-16T22:43:24.755Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Current PostCSS six | 92 | 99 | 7.3% | 7.2% | 7.3% | 1.6% | higher time in every pair, beyond control spread |
| Current secure 21 | 31 | 20 | -38.1% | -37.2% | -39.1% | 5.3% | lower time in every pair, beyond control spread |
| Current secure 64 | 75 | 37 | -50.3% | -51.1% | -49.3% | 6.1% | lower time in every pair, beyond control spread |
| Current custom hex | 33 | 18 | -43.1% | -41.8% | -45.2% | 7% | lower time in every pair, beyond control spread |
| Current custom decimal | 161 | 62 | -61.2% | -60.3% | -61.9% | 4.4% | lower time in every pair, beyond control spread |
| App PostCSS six | 93 | 96 | 2.4% | 6.3% | 2.1% | 3.7% | unestablished at this precision |
| App secure 21 | 142 | 20 | -86.3% | -86.1% | -86.5% | 2.9% | lower time in every pair, beyond control spread |
| App secure 64 | 342 | 35 | -89.7% | -90% | -89.5% | 5.1% | lower time in every pair, beyond control spread |
| App custom hex | 171 | 20 | -88.4% | -87.5% | -88.4% | 1.7% | lower time in every pair, beyond control spread |
| App custom decimal | 375 | 60 | -83.9% | -84.8% | -83.8% | 4.9% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-16T22:44:11.720Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Current PostCSS six | 30 | 30 | 2.9% | 3.4% | 0.4% | 8.3% | unestablished at this precision |
| Current secure 21 | 24 | 15 | -38% | -38% | -38.3% | 1.7% | lower time in every pair, beyond control spread |
| Current secure 64 | 56 | 28 | -49.8% | -49.1% | -50.1% | 7% | lower time in every pair, beyond control spread |
| Current custom hex | 25 | 16 | -35.5% | -35.3% | -38.8% | 17.8% | lower time in every pair, beyond control spread |
| Current custom decimal | 130 | 45 | -65.1% | -65.1% | -65.2% | 4.6% | lower time in every pair, beyond control spread |
| App PostCSS six | 35 | 39 | 15% | 17.3% | 10.4% | 7.1% | higher time in every pair, beyond control spread |
| App secure 21 | 101 | 23 | -77.8% | -73% | -83.3% | 5% | lower time in every pair, beyond control spread |
| App secure 64 | 295 | 34 | -88.4% | -88.2% | -88.9% | 0.7% | lower time in every pair, beyond control spread |
| App custom hex | 148 | 19 | -87.3% | -88.3% | -86.6% | 5.6% | lower time in every pair, beyond control spread |
| App custom decimal | 347 | 44 | -87.1% | -87% | -87.5% | 1.4% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vnanoid/bench/results/node-isolated.json node packages/vnanoid/bench/compare.cjs
OUTPUT=packages/vnanoid/bench/results/bun-isolated.json bun packages/vnanoid/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vnanoid results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
