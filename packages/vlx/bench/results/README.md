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

Recorded 2026-11-13T08:05:52.640Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 31559 | 29121 | -8.1% | -10.6% | -7.4% | 2.3% | lower time in every pair, beyond control spread |
| SVG / fraction / uncached | 238337 | 25380 | -89.3% | -89.7% | -89.1% | 49.4% | lower time in every pair, beyond control spread |
| HTML / styled text / uncached | 58068 | 39652 | -26.8% | -26.2% | -49.8% | 1.6% | lower time in every pair, beyond control spread |
| SVG / styled text / uncached | 939660 | 36657 | -96.1% | -96.6% | -95.7% | 3% | lower time in every pair, beyond control spread |
| HTML / array / uncached | 52162 | 36423 | -30.5% | -30.5% | -30.5% | 12.5% | lower time in every pair, beyond control spread |
| SVG / array / uncached | 356844 | 36091 | -89.9% | -90.7% | -89.1% | 68.9% | lower time in every pair, beyond control spread |
| HTML / contest relations / uncached | 63162 | 36121 | -42.9% | -42.8% | -44.7% | 48.6% | unestablished at this precision |
| SVG / contest relations / uncached | 530371 | 36547 | -93.1% | -93.5% | -92.8% | 104.6% | unestablished at this precision |
| HTML / continued fraction and operators / uncached | 61854 | 38919 | -36.7% | -37.2% | -36.7% | 6.7% | lower time in every pair, beyond control spread |
| SVG / continued fraction and operators / uncached | 1317439 | 39279 | -97.1% | -97.1% | -97.1% | 4.1% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-13T08:06:54.223Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 36550 | 32820 | -9.2% | -7.8% | -15.3% | 5.6% | unestablished at this precision |
| SVG / fraction / uncached | 163702 | 32180 | -80.8% | -83.5% | -77.7% | 12.8% | lower time in every pair, beyond control spread |
| HTML / styled text / uncached | 54599 | 43695 | -17.4% | -17.4% | -26.4% | 70.5% | unestablished at this precision |
| SVG / styled text / uncached | 797709 | 42313 | -94.5% | -95.4% | -93.3% | 5.2% | lower time in every pair, beyond control spread |
| HTML / array / uncached | 48752 | 40913 | -16.1% | -24.2% | 20.2% | 13.1% | unestablished at this precision |
| SVG / array / uncached | 342086 | 41869 | -88% | -89.8% | -79.5% | 17.6% | lower time in every pair, beyond control spread |
| HTML / contest relations / uncached | 58980 | 43711 | -25.8% | -20.9% | -25.8% | 17.6% | unestablished at this precision |
| SVG / contest relations / uncached | 458688 | 40233 | -90.9% | -94.7% | -90.2% | 3.4% | lower time in every pair, beyond control spread |
| HTML / continued fraction and operators / uncached | 64801 | 49482 | -23.6% | -39.1% | -3.9% | 3.6% | unestablished at this precision |
| SVG / continued fraction and operators / uncached | 1153836 | 48900 | -95.9% | -96.3% | -95.6% | 9.2% | lower time in every pair, beyond control spread |

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
