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

Recorded 2026-11-17T19:32:35.912Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| formula PNG / resvg 2.6.2 | 287054 | 5215552 | 1717.1% | 1717.1% | 1729.3% | 3.9% | higher time in every pair, beyond control spread |
| problem PNG / resvg 2.6.2 | 3058617 | 31566135 | 925.4% | 953.9% | 889.8% | 15.6% | higher time in every pair, beyond control spread |
| problem with figure PNG / resvg 2.6.2 | 11352260 | 47907427 | 319.3% | 443.9% | 319.3% | 2.3% | higher time in every pair, beyond control spread |
| layout and picture PNG / resvg 2.6.2 | 3267498 | 31297649 | 858.2% | 858.2% | 641.1% | 3.1% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-17T19:35:36.956Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| formula PNG / resvg 2.6.2 | 624021 | 21503807 | 3360.5% | 3483.4% | 3360.5% | 301.2% | higher time in every pair, beyond control spread |
| problem PNG / resvg 2.6.2 | 19862562 | 100626599 | 365.3% | 1217.8% | 365.3% | 160.7% | unestablished at this precision |
| problem with figure PNG / resvg 2.6.2 | 21905062 | 137791365 | 702.5% | 835.5% | 498.5% | 47.4% | higher time in every pair, beyond control spread |
| layout and picture PNG / resvg 2.6.2 | 11027282 | 103152412 | 1564.5% | 2637.7% | 334.4% | 467.7% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/raster.cjs:

```sh
OUTPUT=packages/vlx/bench/raster/node-isolated.json node packages/vlx/bench/raster.cjs
OUTPUT=packages/vlx/bench/raster/bun-isolated.json bun packages/vlx/bench/raster.cjs
node scripts/render-bench-report.cjs packages/vlx raster raster.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
