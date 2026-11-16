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

Recorded 2026-11-16T23:05:17.745Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Current PostCSS six | 92 | 94 | 1.2% | 1.2% | 3.7% | 4.5% | unestablished at this precision |
| Current non-secure 21 | 302 | 296 | -0.9% | -0.7% | -1.9% | 2.8% | unestablished at this precision |
| Current secure 21 | 33 | 20 | -40% | -38% | -42.9% | 2.1% | lower time in every pair, beyond control spread |
| Current secure 64 | 76 | 35 | -53.3% | -53.3% | -53.1% | 2.2% | lower time in every pair, beyond control spread |
| Current custom hex | 33 | 18 | -44.9% | -43.2% | -46.1% | 7.7% | lower time in every pair, beyond control spread |
| Current custom decimal | 161 | 62 | -62% | -61.3% | -62% | 1.7% | lower time in every pair, beyond control spread |
| App PostCSS six | 95 | 91 | -4.4% | -2.5% | -6% | 2.4% | unestablished at this precision |
| App non-secure 21 | 293 | 292 | -0.3% | 0.1% | -0.3% | 3.6% | unestablished at this precision |
| App secure 21 | 143 | 20 | -86% | -85.3% | -86.6% | 3.5% | lower time in every pair, beyond control spread |
| App secure 64 | 345 | 36 | -89.7% | -89.5% | -89.7% | 5.9% | lower time in every pair, beyond control spread |
| App custom hex | 171 | 20 | -88.2% | -87.9% | -88.2% | 3.5% | lower time in every pair, beyond control spread |
| App custom decimal | 377 | 62 | -83.6% | -83.8% | -83.6% | 5.1% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-16T23:06:16.028Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Current PostCSS six | 30 | 31 | 3.3% | 0.5% | 5.3% | 2.4% | unestablished at this precision |
| Current non-secure 21 | 116 | 108 | -6.8% | -6.8% | -7.6% | 6.9% | unestablished at this precision |
| Current secure 21 | 25 | 14 | -42.9% | -38.1% | -51% | 34.9% | lower time in every pair, beyond control spread |
| Current secure 64 | 59 | 31 | -47.4% | -46.3% | -49.9% | 1.8% | lower time in every pair, beyond control spread |
| Current custom hex | 31 | 18 | -42.6% | -34.4% | -46.7% | 9.4% | lower time in every pair, beyond control spread |
| Current custom decimal | 130 | 45 | -65.7% | -62.6% | -67.1% | 5.7% | lower time in every pair, beyond control spread |
| App PostCSS six | 42 | 36 | -14% | -8.2% | -14% | 1.8% | unestablished at this precision |
| App non-secure 21 | 121 | 121 | -1.2% | -3.3% | 0.3% | 4.2% | unestablished at this precision |
| App secure 21 | 107 | 23 | -78.7% | -75% | -81.2% | 1.5% | lower time in every pair, beyond control spread |
| App secure 64 | 295 | 36 | -87.8% | -87.2% | -88.3% | 2% | lower time in every pair, beyond control spread |
| App custom hex | 147 | 16 | -89.1% | -89.1% | -87.5% | 5.2% | lower time in every pair, beyond control spread |
| App custom decimal | 356 | 45 | -87.4% | -87.3% | -87.7% | 5.7% | lower time in every pair, beyond control spread |

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
