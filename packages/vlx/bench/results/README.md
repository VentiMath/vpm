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

Recorded 2026-11-04T01:25:01.373Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 34598 | 17530 | -48.3% | -50.8% | -45.2% | 12% | lower time in every pair, beyond control spread |
| SVG / fraction / uncached | 265302 | 16692 | -94% | -94% | -94.3% | 3.8% | lower time in every pair, beyond control spread |
| HTML / styled text / uncached | 56212 | 27712 | -51.8% | -49.9% | -60.5% | 41.7% | lower time in every pair, beyond control spread |
| SVG / styled text / uncached | 1020164 | 26835 | -97.4% | -97.7% | -96.7% | 49.1% | lower time in every pair, beyond control spread |
| HTML / array / uncached | 56009 | 21584 | -61.5% | -63.7% | -60.2% | 19% | lower time in every pair, beyond control spread |
| SVG / array / uncached | 398459 | 22146 | -94% | -92.7% | -94% | 29.2% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-04T01:25:54.191Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 38520 | 19223 | -50% | -44.5% | -51.4% | 38.6% | unestablished at this precision |
| SVG / fraction / uncached | 227274 | 17479 | -92.9% | -94% | -91.2% | 18.3% | lower time in every pair, beyond control spread |
| HTML / styled text / uncached | 57086 | 28296 | -50.4% | -41.2% | -53.8% | 28.8% | lower time in every pair, beyond control spread |
| SVG / styled text / uncached | 731011 | 24993 | -96.5% | -98.4% | -96% | 20.1% | lower time in every pair, beyond control spread |
| HTML / array / uncached | 57228 | 23204 | -57.5% | -65.8% | -54.3% | 20.8% | lower time in every pair, beyond control spread |
| SVG / array / uncached | 324767 | 23007 | -93.5% | -95.9% | -92.8% | 40.7% | lower time in every pair, beyond control spread |

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
