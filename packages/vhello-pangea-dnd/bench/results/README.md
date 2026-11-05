# vhello-pangea-dnd measurements

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

Recorded 2026-11-05T07:36:33.248Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR 32 cards | 258359 | 68464 | -73.5% | -74.8% | -73.2% | 2.6% | lower time in every pair, beyond control spread |
| unchanged 32 cards | 252953 | 52632 | -79.5% | -77.7% | -79.9% | 4.5% | lower time in every pair, beyond control spread |
| reorder 32 cards | 445744 | 194647 | -56.6% | -56.6% | -55.8% | 3.5% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-05T07:36:52.880Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR 32 cards | 182727 | 47946 | -73.8% | -75.8% | -71.4% | 70.5% | lower time in every pair, beyond control spread |
| unchanged 32 cards | 168884 | 35874 | -78.6% | -79.2% | -77.8% | 4.4% | lower time in every pair, beyond control spread |
| reorder 32 cards | 308597 | 119058 | -61.4% | -64.1% | -56.5% | 27.8% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vhello-pangea-dnd/bench/results/node-isolated.json node packages/vhello-pangea-dnd/bench/compare.cjs
OUTPUT=packages/vhello-pangea-dnd/bench/results/bun-isolated.json bun packages/vhello-pangea-dnd/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vhello-pangea-dnd results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
