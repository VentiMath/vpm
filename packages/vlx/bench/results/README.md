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

Recorded 2026-11-03T22:43:37.026Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 35356 | 17784 | -49.9% | -51.5% | -47.5% | 4.4% | lower time in every pair, beyond control spread |
| SVG / fraction / uncached | 243888 | 17007 | -93% | -92.4% | -93% | 7.8% | lower time in every pair, beyond control spread |
| HTML / styled text / uncached | 56769 | 27283 | -51.5% | -50.2% | -57.8% | 22.3% | lower time in every pair, beyond control spread |
| SVG / styled text / uncached | 1045991 | 26656 | -97.5% | -97.5% | -97.8% | 5.4% | lower time in every pair, beyond control spread |
| HTML / array / uncached | 55980 | 21354 | -61.3% | -61.3% | -66.8% | 11.7% | lower time in every pair, beyond control spread |
| SVG / array / uncached | 427892 | 19543 | -95.4% | -95.6% | -95.2% | 26.5% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-03T22:44:18.496Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 38474 | 17305 | -54.3% | -54.3% | -62.1% | 3.2% | lower time in every pair, beyond control spread |
| SVG / fraction / uncached | 162848 | 16638 | -89.6% | -92.3% | -88.3% | 16.4% | lower time in every pair, beyond control spread |
| HTML / styled text / uncached | 57905 | 27575 | -52.4% | -54.5% | -51.6% | 5% | lower time in every pair, beyond control spread |
| SVG / styled text / uncached | 757922 | 26994 | -96.3% | -97.1% | -95.3% | 3.6% | lower time in every pair, beyond control spread |
| HTML / array / uncached | 54690 | 23873 | -56.3% | -52.3% | -60.8% | 3% | lower time in every pair, beyond control spread |
| SVG / array / uncached | 307996 | 23162 | -92.2% | -93% | -78.8% | 21.8% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vlx/bench/results/node-isolated.json node packages/vlx/bench/compare.cjs
OUTPUT=packages/vlx/bench/results/bun-isolated.json bun packages/vlx/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vlx results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
