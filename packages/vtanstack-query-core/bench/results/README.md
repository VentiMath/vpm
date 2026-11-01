# vtanstack-query-core measurements

These records supersede the earlier same-process comparison. Each timed
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
Negative changes mean less time; these are local CPU measurements, not
application throughput or latency guarantees.

## Node 24.22.1

Recorded 2026-11-01T07:44:58.921Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| client construction | 160 | 118 | -26.2% | -24.8% | -27.2% | 3% | lower time in every pair, beyond control spread |
| cached query read | 630 | 565 | -10.4% | -9.3% | -11.3% | 1.8% | lower time in every pair, beyond control spread |
| unchanged JSON update, 16 records | 5617 | 4461 | -20.5% | -20.5% | -21.8% | 0.3% | lower time in every pair, beyond control spread |
| fresh fetchQuery cache hit | 633 | 517 | -18.4% | -18.4% | 51.1% | 2.6% | unestablished at this precision |
| deduplicated concurrent requests | 4027 | 2237 | -44.1% | -42.3% | -47.9% | 1.7% | lower time in every pair, beyond control spread |
| active invalidation and refresh | 3510 | 3078 | -12.8% | -13.8% | -12.8% | 4.9% | lower time in every pair, beyond control spread |
| mutation and completed-entry cleanup | 1210 | 945 | -22.1% | -25.9% | -22.1% | 11.6% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T07:45:27.663Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| client construction | 77 | 75 | -2.9% | -4.1% | -1.1% | 1.8% | unestablished at this precision |
| cached query read | 618 | 412 | -33.3% | -33.8% | -33% | 4.6% | lower time in every pair, beyond control spread |
| unchanged JSON update, 16 records | 3055 | 3488 | 13.6% | 13.6% | 14.5% | 1.6% | higher time in every pair, beyond control spread |
| fresh fetchQuery cache hit | 513 | 378 | -26.3% | -26.8% | -25.3% | 0.2% | lower time in every pair, beyond control spread |
| deduplicated concurrent requests | 2692 | 1865 | -31.1% | -33.1% | -29.4% | 2.7% | lower time in every pair, beyond control spread |
| active invalidation and refresh | 2763 | 2597 | -5.5% | -7.9% | -4.8% | 5.1% | unestablished at this precision |
| mutation and completed-entry cleanup | 2069 | 1135 | -45.2% | -46.1% | -44.4% | 2.3% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vtanstack-query-core/bench/results/node-isolated.json node packages/vtanstack-query-core/bench/compare.cjs
OUTPUT=packages/vtanstack-query-core/bench/results/bun-isolated.json bun packages/vtanstack-query-core/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vtanstack-query-core
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
