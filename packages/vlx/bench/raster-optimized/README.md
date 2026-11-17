# vlx measurements

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

Recorded 2026-11-17T20:03:53.436Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| formula PNG / resvg 2.6.2 | 281344 | 939272 | 231.6% | 224.5% | 241.7% | 1.6% | higher time in every pair, beyond control spread |
| problem PNG / resvg 2.6.2 | 2948318 | 6111310 | 108.6% | 97.1% | 125.8% | 2.2% | higher time in every pair, beyond control spread |
| problem with figure PNG / resvg 2.6.2 | 10589781 | 13225219 | 26.6% | 24.7% | 79.8% | 4.3% | higher time in every pair, beyond control spread |
| layout and picture PNG / resvg 2.6.2 | 3130161 | 6183060 | 97% | 95.7% | 172.2% | 1% | higher time in every pair, beyond control spread |
| formula PNG / previous owned renderer | 4665655 | 920291 | -80.6% | -80.7% | -80.2% | 2.4% | lower time in every pair, beyond control spread |
| problem PNG / previous owned renderer | 29484302 | 5837719 | -80.4% | -80.1% | -80.7% | 5.2% | lower time in every pair, beyond control spread |
| problem with figure PNG / previous owned renderer | 45459094 | 13337385 | -70.5% | -47.6% | -71.3% | 3.5% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-17T20:06:23.804Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| formula PNG / resvg 2.6.2 | 282275 | 680613 | 139.2% | 139.2% | 143% | 44.7% | higher time in every pair, beyond control spread |
| problem PNG / resvg 2.6.2 | 2863201 | 4171281 | 45.3% | 47.4% | 45.3% | 7.5% | higher time in every pair, beyond control spread |
| problem with figure PNG / resvg 2.6.2 | 10395781 | 39934313 | 284% | 548.8% | 21.1% | 3.6% | higher time in every pair, beyond control spread |
| layout and picture PNG / resvg 2.6.2 | 3119284 | 4428278 | 41.3% | 43.4% | 38.9% | 3.5% | higher time in every pair, beyond control spread |
| formula PNG / previous owned renderer | 14472264 | 655837 | -95.5% | -95.8% | -83.9% | 522.2% | unestablished at this precision |
| problem PNG / previous owned renderer | 81408084 | 4185816 | -94.9% | -95.1% | -85.1% | 358.2% | unestablished at this precision |
| problem with figure PNG / previous owned renderer | 93591198 | 40938833 | -50.1% | -28.4% | -77.5% | 194.3% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/raster-optimized.cjs:

```sh
OUTPUT=packages/vlx/bench/raster-optimized/node-isolated.json node packages/vlx/bench/raster-optimized.cjs
OUTPUT=packages/vlx/bench/raster-optimized/bun-isolated.json bun packages/vlx/bench/raster-optimized.cjs
node scripts/render-bench-report.cjs packages/vlx raster-optimized raster-optimized.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
