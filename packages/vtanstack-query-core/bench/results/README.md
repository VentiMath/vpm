# vtanstack-query-core measurements

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

Recorded 2026-11-04T16:37:11.981Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| client construction | 158 | 117 | -26.2% | -25% | -26.6% | 6.7% | lower time in every pair, beyond control spread |
| cached query read | 623 | 578 | -6.2% | -4.2% | -9.1% | 2% | lower time in every pair, beyond control spread |
| unchanged JSON update, 16 records | 5596 | 4436 | -20.9% | -20% | -20.9% | 4.3% | lower time in every pair, beyond control spread |
| fresh fetchQuery cache hit | 642 | 520 | -17.2% | -15.2% | -20% | 0.5% | lower time in every pair, beyond control spread |
| deduplicated concurrent requests | 5295 | 2229 | -58.6% | -58.2% | -58.6% | 11.5% | lower time in every pair, beyond control spread |
| active invalidation and refresh | 5437 | 3188 | -40.3% | -45.3% | -37.3% | 1.4% | lower time in every pair, beyond control spread |
| mutation and completed-entry cleanup | 1354 | 946 | -30% | -28.4% | -32.1% | 3% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-04T16:37:40.227Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| client construction | 73 | 72 | 0.7% | 0.7% | -1.5% | 4.8% | unestablished at this precision |
| cached query read | 563 | 382 | -32% | -33.4% | -32% | 2.1% | lower time in every pair, beyond control spread |
| unchanged JSON update, 16 records | 2807 | 3490 | 20.7% | 16.5% | 21.8% | 1.7% | higher time in every pair, beyond control spread |
| fresh fetchQuery cache hit | 439 | 333 | -24.2% | -25.1% | 52% | 1.5% | unestablished at this precision |
| deduplicated concurrent requests | 2906 | 1720 | -40.1% | -42.7% | -35.6% | 0.3% | lower time in every pair, beyond control spread |
| active invalidation and refresh | 3189 | 2316 | -26.8% | -27.7% | -26.8% | 3% | lower time in every pair, beyond control spread |
| mutation and completed-entry cleanup | 1958 | 1044 | -46.7% | -46.7% | -45.8% | 5% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vtanstack-query-core/bench/results/node-isolated.json node packages/vtanstack-query-core/bench/compare.cjs
OUTPUT=packages/vtanstack-query-core/bench/results/bun-isolated.json bun packages/vtanstack-query-core/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vtanstack-query-core results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
