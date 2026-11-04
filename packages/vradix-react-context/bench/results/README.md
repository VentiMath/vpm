# vradix-react-context measurements

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

Recorded 2026-11-04T15:58:44.470Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create context | 728 | 33 | -95.5% | -95.3% | -95.5% | 6.2% | lower time in every pair, beyond control spread |
| create scope / 16 contexts | 13393 | 1319 | -90.1% | -90.3% | -87.8% | 4.3% | lower time in every pair, beyond control spread |
| SSR / provider and consumer | 4880 | 4718 | -1% | -8.3% | 264.8% | 1.8% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-04T15:58:58.813Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create context | 226 | 55 | -76.5% | -75.6% | -78.3% | 4.3% | lower time in every pair, beyond control spread |
| create scope / 16 contexts | 5828 | 2219 | -61.8% | -62.6% | -60.9% | 2.2% | lower time in every pair, beyond control spread |
| SSR / provider and consumer | 2107 | 2107 | -2.1% | -3.7% | 1.1% | 14.4% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vradix-react-context/bench/results/node-isolated.json node packages/vradix-react-context/bench/compare.cjs
OUTPUT=packages/vradix-react-context/bench/results/bun-isolated.json bun packages/vradix-react-context/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-context results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
