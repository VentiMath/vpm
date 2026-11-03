# vradix-rect measurements

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

Recorded 2026-11-03T21:55:02.676Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| subscribe and unsubscribe | 109 | 118 | 8% | 7.2% | 8.6% | 1% | higher time in every pair, beyond control spread |
| unchanged frame / 1 elements | 125 | 114 | -8.5% | -8.2% | -10.1% | 2.7% | lower time in every pair, beyond control spread |
| changed frame / 1 elements | 156 | 149 | -5.8% | -5.4% | -6% | 4.1% | lower time in every pair, beyond control spread |
| unchanged frame / 100 elements | 1469 | 1049 | -28.6% | -26.4% | -31.4% | 24.4% | lower time in every pair, beyond control spread |
| changed frame / 100 elements | 2609 | 1803 | -30.9% | -30% | -31.9% | 4.2% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-03T21:55:22.881Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| subscribe and unsubscribe | 102 | 110 | 6% | 3.8% | 18.1% | 14.8% | unestablished at this precision |
| unchanged frame / 1 elements | 140 | 128 | -8.1% | -9.3% | -5.1% | 9% | unestablished at this precision |
| changed frame / 1 elements | 159 | 133 | -13.6% | -13.6% | -11.3% | 43.8% | unestablished at this precision |
| unchanged frame / 100 elements | 2289 | 1702 | -23.5% | -23.5% | -14.5% | 7.4% | unestablished at this precision |
| changed frame / 100 elements | 4082 | 2676 | -35.1% | -36% | -34.4% | 23% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vradix-rect/bench/results/node-isolated.json node packages/vradix-rect/bench/compare.cjs
OUTPUT=packages/vradix-rect/bench/results/bun-isolated.json bun packages/vradix-rect/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-rect results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
