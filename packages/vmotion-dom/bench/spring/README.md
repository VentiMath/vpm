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

Recorded 2026-11-09T19:35:55.327Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create calendar scale spring | 311 | 63 | -79.8% | -79.7% | -79.8% | 22.6% | lower time in every pair, beyond control spread |
| sample spring value and velocity | 44 | 68 | 53.7% | 37.4% | 53.7% | 14.3% | higher time in every pair, beyond control spread |
| create duration-calibrated spring | 1468 | 112 | -92.4% | -92.6% | -92.4% | 8.7% | lower time in every pair, beyond control spread |
| create, measure and dispose spring playback | 923 | 684 | -25.8% | -35.7% | -25.8% | 3.8% | lower time in every pair, beyond control spread |
| advance repeating scale spring | 122 | 96 | -20.9% | -25.4% | -16.9% | 4.1% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T19:36:18.040Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create calendar scale spring | 112 | 55 | -51.8% | -53.9% | -49.3% | 2.1% | lower time in every pair, beyond control spread |
| sample spring value and velocity | 41 | 41 | 1.5% | 0% | 2.6% | 10.4% | unestablished at this precision |
| create duration-calibrated spring | 602 | 102 | -83.2% | -83.7% | -83% | 6% | lower time in every pair, beyond control spread |
| create, measure and dispose spring playback | 437 | 431 | 0.5% | 0.8% | -3.3% | 8.6% | unestablished at this precision |
| advance repeating scale spring | 101 | 56 | -44.8% | -45.2% | -44.8% | 3.2% | lower time in every pair, beyond control spread |

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
