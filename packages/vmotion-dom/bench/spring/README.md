# vmotion-dom measurements

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

Recorded 2026-11-09T20:21:29.111Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create calendar scale spring | 310 | 64 | -78.8% | -79.3% | -78.8% | 2.1% | lower time in every pair, beyond control spread |
| sample spring value and velocity | 43 | 68 | 60.7% | 61.3% | 57.6% | 5.6% | higher time in every pair, beyond control spread |
| create duration-calibrated spring | 1523 | 113 | -92.5% | -92.6% | -92.5% | 2.1% | lower time in every pair, beyond control spread |
| create, measure and dispose spring playback | 960 | 695 | -26.9% | -26.9% | -27.3% | 1.6% | lower time in every pair, beyond control spread |
| advance repeating scale spring | 116 | 98 | -15% | -18.6% | -12.8% | 0.7% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T20:21:51.296Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create calendar scale spring | 109 | 54 | -51.7% | -51.7% | -50.8% | 11.3% | lower time in every pair, beyond control spread |
| sample spring value and velocity | 41 | 41 | 0.3% | -10.7% | 4.6% | 10.4% | unestablished at this precision |
| create duration-calibrated spring | 558 | 102 | -81.2% | -83.2% | -79.2% | 23.2% | lower time in every pair, beyond control spread |
| create, measure and dispose spring playback | 464 | 442 | -5% | -6% | -3.5% | 7.9% | unestablished at this precision |
| advance repeating scale spring | 102 | 59 | -41.3% | -41.3% | -44.1% | 1.4% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/spring.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/spring/node-isolated.json node packages/vmotion-dom/bench/spring.cjs
OUTPUT=packages/vmotion-dom/bench/spring/bun-isolated.json bun packages/vmotion-dom/bench/spring.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom spring spring.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
