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

Recorded 2026-11-03T02:18:55.854Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| client construction | 155 | 115 | -25.5% | -24.8% | -26.6% | 0.3% | lower time in every pair, beyond control spread |
| cached query read | 618 | 586 | -5.5% | -5.5% | -5.1% | 1.8% | lower time in every pair, beyond control spread |
| unchanged JSON update, 16 records | 5583 | 4449 | -19.9% | 3.3% | -19.9% | 3.2% | unestablished at this precision |
| fresh fetchQuery cache hit | 624 | 524 | -16% | -18.2% | -16% | 1.6% | lower time in every pair, beyond control spread |
| deduplicated concurrent requests | 5370 | 2194 | -59.5% | -61% | -58% | 5.2% | lower time in every pair, beyond control spread |
| active invalidation and refresh | 5383 | 3234 | -38.7% | -43.4% | -35% | 5.5% | lower time in every pair, beyond control spread |
| mutation and completed-entry cleanup | 1330 | 937 | -29.6% | -28.6% | -30.2% | 2.6% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-03T02:20:15.980Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| client construction | 77 | 77 | -0.6% | -3.4% | 2.3% | 6.3% | unestablished at this precision |
| cached query read | 617 | 407 | -32.8% | -34.7% | -32% | 1.7% | lower time in every pair, beyond control spread |
| unchanged JSON update, 16 records | 2998 | 3521 | 17.5% | 46.1% | 8.7% | 3% | higher time in every pair, beyond control spread |
| fresh fetchQuery cache hit | 503 | 372 | -26% | -27.6% | -25.6% | 2.6% | lower time in every pair, beyond control spread |
| deduplicated concurrent requests | 3082 | 1818 | -41% | -42.4% | -39.5% | 3.3% | lower time in every pair, beyond control spread |
| active invalidation and refresh | 3364 | 2602 | -22.6% | -22.5% | -23.7% | 4.2% | lower time in every pair, beyond control spread |
| mutation and completed-entry cleanup | 2071 | 1125 | -45.1% | -45.1% | -47.3% | 24.7% | lower time in every pair, beyond control spread |

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
