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

Recorded 2026-11-03T22:13:56.952Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 33167 | 16133 | -52.4% | -52.7% | -51.2% | 6.5% | lower time in every pair, beyond control spread |
| SVG / fraction / uncached | 244017 | 13972 | -94.2% | -95% | -93.7% | 13.9% | lower time in every pair, beyond control spread |
| HTML / array / uncached | 54672 | 17720 | -67.8% | -67.4% | -67.8% | 189.1% | unestablished at this precision |
| SVG / array / uncached | 410289 | 16497 | -96% | -96.6% | -95.3% | 15.3% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-03T22:14:22.288Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 40578 | 17335 | -58.6% | -63.4% | -36.9% | 13.6% | lower time in every pair, beyond control spread |
| SVG / fraction / uncached | 177770 | 17540 | -92.4% | -95.1% | -88.7% | 8.8% | lower time in every pair, beyond control spread |
| HTML / array / uncached | 55786 | 20119 | -62.7% | -79.2% | -60.3% | 5.7% | lower time in every pair, beyond control spread |
| SVG / array / uncached | 303058 | 19286 | -93.1% | -92.6% | -93.1% | 5.2% | lower time in every pair, beyond control spread |

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
