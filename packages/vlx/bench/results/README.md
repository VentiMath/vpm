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

Recorded 2026-11-04T03:21:16.976Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 38878 | 20142 | -47.8% | -49.3% | -46.6% | 3.5% | lower time in every pair, beyond control spread |
| SVG / fraction / uncached | 276029 | 21130 | -92.5% | -92.5% | -92.5% | 18.9% | lower time in every pair, beyond control spread |
| HTML / styled text / uncached | 64783 | 31278 | -51.7% | -51.9% | -51.7% | 5.7% | lower time in every pair, beyond control spread |
| SVG / styled text / uncached | 1100624 | 30751 | -97.2% | -97.6% | -96.8% | 1.4% | lower time in every pair, beyond control spread |
| HTML / array / uncached | 62160 | 24317 | -61.1% | -57.5% | -61.5% | 3.1% | lower time in every pair, beyond control spread |
| SVG / array / uncached | 466960 | 23726 | -95% | -95% | -94.7% | 2.9% | lower time in every pair, beyond control spread |
| HTML / contest relations / uncached | 75048 | 29726 | -60.3% | -59.8% | -61.2% | 3.2% | lower time in every pair, beyond control spread |
| SVG / contest relations / uncached | 633182 | 28507 | -95.5% | -95.6% | -95.4% | 2.7% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-04T03:22:13.821Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 41779 | 20256 | -52.2% | -53.8% | -50.8% | 100.3% | unestablished at this precision |
| SVG / fraction / uncached | 172512 | 18991 | -88.9% | -90.6% | -87.8% | 101.3% | unestablished at this precision |
| HTML / styled text / uncached | 62646 | 32065 | -48.9% | -47.4% | -50.6% | 109.8% | unestablished at this precision |
| SVG / styled text / uncached | 791924 | 30154 | -96.2% | -96.7% | -95.6% | 106.4% | unestablished at this precision |
| HTML / array / uncached | 60703 | 26155 | -56% | -50% | -56% | 5.9% | lower time in every pair, beyond control spread |
| SVG / array / uncached | 326563 | 27543 | -91.4% | -92.1% | -91.3% | 43.6% | lower time in every pair, beyond control spread |
| HTML / contest relations / uncached | 73155 | 29243 | -60.1% | -56.4% | -60.1% | 95.9% | unestablished at this precision |
| SVG / contest relations / uncached | 470316 | 28354 | -94% | -94.3% | -93.6% | 80.5% | lower time in every pair, beyond control spread |

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
