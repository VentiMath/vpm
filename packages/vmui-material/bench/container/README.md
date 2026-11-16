# vmui-material measurements

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

Recorded 2026-11-16T23:34:24.403Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 warml Container SSR | 163783 | 121927 | -26.3% | -26.9% | -25.1% | 2.9% | lower time in every pair, beyond control spread |
| Material9 results Container SSR | 160075 | 112659 | -29.8% | -30.8% | -29.3% | 36.7% | unestablished at this precision |
| Material9 signup Container SSR | 164509 | 112617 | -32.1% | -33.5% | -29.8% | 19.5% | lower time in every pair, beyond control spread |
| App7 warml Container SSR | 157624 | 111977 | -29.9% | -38.4% | -24.5% | 17.7% | lower time in every pair, beyond control spread |
| App7 results Container SSR | 144454 | 110571 | -22.3% | -26.8% | -18.7% | 4.8% | lower time in every pair, beyond control spread |
| App7 signup Container SSR | 142764 | 108270 | -23.3% | -30.3% | -20.5% | 28.4% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-16T23:34:50.495Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 warml Container SSR | 91471 | 57995 | -36.4% | -37.8% | -36.4% | 2.8% | lower time in every pair, beyond control spread |
| Material9 results Container SSR | 88900 | 50739 | -42.6% | -43% | -42.6% | 0.1% | lower time in every pair, beyond control spread |
| Material9 signup Container SSR | 87039 | 53675 | -39.1% | -39.6% | -38.1% | 2.3% | lower time in every pair, beyond control spread |
| App7 warml Container SSR | 90248 | 55131 | -39.4% | -33.1% | -42.1% | 9.5% | lower time in every pair, beyond control spread |
| App7 results Container SSR | 86362 | 54815 | -39.2% | -35.1% | -39.9% | 10.8% | lower time in every pair, beyond control spread |
| App7 signup Container SSR | 90585 | 51200 | -42.6% | -45.2% | -40.8% | 6.1% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/container.cjs:

```sh
OUTPUT=packages/vmui-material/bench/container/node-isolated.json node packages/vmui-material/bench/container.cjs
OUTPUT=packages/vmui-material/bench/container/bun-isolated.json bun packages/vmui-material/bench/container.cjs
node scripts/render-bench-report.cjs packages/vmui-material container container.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
