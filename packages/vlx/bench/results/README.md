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

Recorded 2026-11-04T05:16:50.480Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 33331 | 21556 | -34.4% | -37.8% | -32.7% | 11.5% | lower time in every pair, beyond control spread |
| SVG / fraction / uncached | 246100 | 20045 | -91.8% | -92.6% | -91.1% | 56.3% | lower time in every pair, beyond control spread |
| HTML / styled text / uncached | 56049 | 31756 | -44.8% | -43.1% | -45.1% | 41.2% | unestablished at this precision |
| SVG / styled text / uncached | 993022 | 29804 | -97% | -97.1% | -96.8% | 6.7% | lower time in every pair, beyond control spread |
| HTML / array / uncached | 55857 | 28260 | -49.4% | -53.4% | -49.4% | 3.7% | lower time in every pair, beyond control spread |
| SVG / array / uncached | 382018 | 27127 | -93% | -93.2% | -92.8% | 13% | lower time in every pair, beyond control spread |
| HTML / contest relations / uncached | 64434 | 29850 | -53.2% | -53.2% | -53.7% | 4.2% | lower time in every pair, beyond control spread |
| SVG / contest relations / uncached | 571489 | 28226 | -95% | -95.1% | -94.9% | 4.6% | lower time in every pair, beyond control spread |
| HTML / continued fraction and operators / uncached | 63506 | 31947 | -49.1% | -49.6% | -48.9% | 3.6% | lower time in every pair, beyond control spread |
| SVG / continued fraction and operators / uncached | 1370022 | 30526 | -97.8% | -97.8% | -97.7% | 9% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-04T05:18:08.548Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 35765 | 28020 | -21.8% | -23.4% | -19% | 2.7% | lower time in every pair, beyond control spread |
| SVG / fraction / uncached | 149846 | 28067 | -82.5% | -87.7% | -79.7% | 28.2% | lower time in every pair, beyond control spread |
| HTML / styled text / uncached | 54932 | 40441 | -26% | -28.4% | -25.7% | 9.1% | lower time in every pair, beyond control spread |
| SVG / styled text / uncached | 719602 | 37331 | -94.8% | -95.2% | -94.2% | 8.1% | lower time in every pair, beyond control spread |
| HTML / array / uncached | 51099 | 35759 | -29.3% | -33.6% | -25.3% | 2.9% | lower time in every pair, beyond control spread |
| SVG / array / uncached | 280628 | 34050 | -87.9% | -88.8% | -87.3% | 11.3% | lower time in every pair, beyond control spread |
| HTML / contest relations / uncached | 60433 | 39811 | -34.6% | -37.1% | -33.7% | 6.1% | lower time in every pair, beyond control spread |
| SVG / contest relations / uncached | 407651 | 35250 | -91.5% | -92% | -90.6% | 37.1% | lower time in every pair, beyond control spread |
| HTML / continued fraction and operators / uncached | 62670 | 44153 | -31.9% | -29% | -35.6% | 7.5% | lower time in every pair, beyond control spread |
| SVG / continued fraction and operators / uncached | 1027091 | 41258 | -96% | -96.4% | -95.7% | 13.7% | lower time in every pair, beyond control spread |

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
