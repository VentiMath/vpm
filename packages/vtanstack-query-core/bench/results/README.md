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

Recorded 2026-11-01T09:57:30.879Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| client construction | 133 | 100 | -25% | -24.1% | -27.4% | 2.7% | lower time in every pair, beyond control spread |
| cached query read | 531 | 472 | -11.1% | -10.1% | -11.6% | 1.7% | lower time in every pair, beyond control spread |
| unchanged JSON update, 16 records | 4705 | 3729 | -20.8% | -19.6% | -22.9% | 3.9% | lower time in every pair, beyond control spread |
| fresh fetchQuery cache hit | 532 | 427 | -19.9% | -19.1% | -20.4% | 3.9% | lower time in every pair, beyond control spread |
| deduplicated concurrent requests | 3454 | 2025 | -42.5% | -46.8% | -38.8% | 6.2% | lower time in every pair, beyond control spread |
| active invalidation and refresh | 2884 | 2538 | -12% | -11% | -33.9% | 4.9% | lower time in every pair, beyond control spread |
| mutation and completed-entry cleanup | 1012 | 794 | -21.6% | -21.2% | -21.7% | 6.5% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T09:58:00.070Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| client construction | 64 | 62 | -2.9% | -2.9% | -13.1% | 9.8% | unestablished at this precision |
| cached query read | 511 | 353 | -31.3% | -32.3% | -31.3% | 2.6% | lower time in every pair, beyond control spread |
| unchanged JSON update, 16 records | 2570 | 3460 | 30.2% | 38.8% | 18.6% | 1.2% | higher time in every pair, beyond control spread |
| fresh fetchQuery cache hit | 437 | 318 | -27.1% | -29.5% | -24.7% | 2.2% | lower time in every pair, beyond control spread |
| deduplicated concurrent requests | 2353 | 1596 | -32.4% | -34.7% | -31.7% | 4.3% | lower time in every pair, beyond control spread |
| active invalidation and refresh | 2396 | 2214 | -7.6% | -7.9% | -7.6% | 20% | unestablished at this precision |
| mutation and completed-entry cleanup | 1746 | 954 | -46.6% | -45.7% | -46.6% | 10.8% | lower time in every pair, beyond control spread |

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
