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

Recorded 2026-11-04T04:25:06.182Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 39148 | 21582 | -41% | -41% | -41% | 22.1% | lower time in every pair, beyond control spread |
| SVG / fraction / uncached | 303611 | 19467 | -92.8% | -93.8% | -91.9% | 21.2% | lower time in every pair, beyond control spread |
| HTML / styled text / uncached | 60381 | 33121 | -46.8% | -43.6% | -51.4% | 2.1% | lower time in every pair, beyond control spread |
| SVG / styled text / uncached | 1146581 | 29314 | -97.5% | -97.5% | -97.2% | 1.8% | lower time in every pair, beyond control spread |
| HTML / array / uncached | 56833 | 24997 | -55% | -56.7% | -54.9% | 2% | lower time in every pair, beyond control spread |
| SVG / array / uncached | 468519 | 23357 | -95% | -95.7% | -94.2% | 8.5% | lower time in every pair, beyond control spread |
| HTML / contest relations / uncached | 69180 | 33717 | -54.3% | -57.8% | -54.3% | 3% | lower time in every pair, beyond control spread |
| SVG / contest relations / uncached | 650012 | 30727 | -95.2% | -95.3% | -95.1% | 11.4% | lower time in every pair, beyond control spread |
| HTML / continued fraction and operators / uncached | 67966 | 32022 | -52.8% | -44.2% | -53% | 10.7% | lower time in every pair, beyond control spread |
| SVG / continued fraction and operators / uncached | 1431715 | 31124 | -97.8% | -98.5% | -97.4% | 5.4% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-04T04:26:52.174Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 42809 | 31218 | -24.2% | -28% | -14.1% | 37.2% | unestablished at this precision |
| SVG / fraction / uncached | 201095 | 30344 | -84.4% | -88.3% | -78.4% | 22.1% | lower time in every pair, beyond control spread |
| HTML / styled text / uncached | 58433 | 43557 | -25% | -25% | 8.2% | 7.8% | unestablished at this precision |
| SVG / styled text / uncached | 896258 | 38995 | -95.4% | -96% | -94% | 34.5% | lower time in every pair, beyond control spread |
| HTML / array / uncached | 56006 | 35736 | -35.9% | -41.5% | -25.1% | 4.5% | lower time in every pair, beyond control spread |
| SVG / array / uncached | 335422 | 35476 | -89.6% | -91% | -86.9% | 9.2% | lower time in every pair, beyond control spread |
| HTML / contest relations / uncached | 72760 | 42805 | -41.8% | -22.4% | -59.2% | 4.5% | lower time in every pair, beyond control spread |
| SVG / contest relations / uncached | 472024 | 37941 | -91.7% | -92.6% | -91.2% | 3.4% | lower time in every pair, beyond control spread |
| HTML / continued fraction and operators / uncached | 67890 | 52443 | -27.7% | -22.8% | -27.7% | 13.3% | unestablished at this precision |
| SVG / continued fraction and operators / uncached | 1309367 | 41651 | -96.5% | -97.2% | -96.3% | 53.9% | lower time in every pair, beyond control spread |

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
