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

Recorded 2026-11-09T20:52:53.967Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create calendar scale spring | 295 | 62 | -78.9% | -78.9% | -78.9% | 2.2% | lower time in every pair, beyond control spread |
| sample spring value and velocity | 43 | 68 | 59.3% | 60.5% | 56.8% | 1.9% | higher time in every pair, beyond control spread |
| create duration-calibrated spring | 1488 | 111 | -92.4% | -92.4% | -92.4% | 2.1% | lower time in every pair, beyond control spread |
| create, measure and dispose spring playback | 930 | 683 | -26.4% | -25.3% | -26.9% | 9.9% | lower time in every pair, beyond control spread |
| advance repeating scale spring | 116 | 97 | -15.9% | -18.4% | -14.6% | 6% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T20:53:16.351Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create calendar scale spring | 111 | 54 | -51.6% | -51.6% | -51.7% | 7.7% | lower time in every pair, beyond control spread |
| sample spring value and velocity | 41 | 41 | -1.3% | -0.1% | -4.5% | 3.3% | unestablished at this precision |
| create duration-calibrated spring | 598 | 103 | -82.7% | -83% | -82.6% | 8.8% | lower time in every pair, beyond control spread |
| create, measure and dispose spring playback | 445 | 444 | -1.2% | 2.3% | -1.2% | 8.8% | unestablished at this precision |
| advance repeating scale spring | 100 | 61 | -39.1% | -37.5% | -41.3% | 4.1% | lower time in every pair, beyond control spread |

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
