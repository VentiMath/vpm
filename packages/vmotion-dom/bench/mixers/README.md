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

Recorded 2026-11-10T04:36:29.857Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a repeated color mixer | 484 | 90 | -81.3% | -81.3% | -81.6% | 0.8% | lower time in every pair, beyond control spread |
| sample a prepared color mixer | 101 | 103 | 1.2% | 0.4% | 2.6% | 0.5% | unestablished at this precision |
| prepare and sample a repeated complex shadow mixer | 2327 | 368 | -84.1% | -84.1% | -83.9% | 2% | lower time in every pair, beyond control spread |
| sample a prepared complex shadow mixer | 433 | 444 | 2.9% | 5.1% | 1.6% | 1.8% | unestablished at this precision |
| prepare color mixers with changing uncached endpoints | 691 | 930 | 34.4% | 34.4% | 37.7% | 0.3% | higher time in every pair, beyond control spread |
| prepare shadow mixers with changing uncached endpoints | 2173 | 2982 | 36.6% | 37.4% | 35.5% | 1.2% | higher time in every pair, beyond control spread |
| sample a prepared numeric interpolation | 14 | 14 | -3.2% | -0.8% | -7.8% | 3.6% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-10T04:37:02.947Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a repeated color mixer | 431 | 44 | -89.7% | -89.7% | -89.7% | 49.7% | lower time in every pair, beyond control spread |
| sample a prepared color mixer | 55 | 33 | -40.7% | -39.6% | -41% | 15.4% | lower time in every pair, beyond control spread |
| prepare and sample a repeated complex shadow mixer | 1724 | 300 | -82.6% | -82.6% | -82.6% | 6.3% | lower time in every pair, beyond control spread |
| sample a prepared complex shadow mixer | 234 | 291 | 23.4% | 24.9% | 23.4% | 7.7% | higher time in every pair, beyond control spread |
| prepare color mixers with changing uncached endpoints | 551 | 736 | 33.7% | 33.7% | 35.9% | 2.6% | higher time in every pair, beyond control spread |
| prepare shadow mixers with changing uncached endpoints | 1758 | 1913 | 11% | 11% | 14.7% | 9.3% | unestablished at this precision |
| sample a prepared numeric interpolation | 11 | 4 | -62.7% | -47.2% | -75.5% | 3% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/mixers.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/mixers/node-isolated.json node packages/vmotion-dom/bench/mixers.cjs
OUTPUT=packages/vmotion-dom/bench/mixers/bun-isolated.json bun packages/vmotion-dom/bench/mixers.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom mixers mixers.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.

Repeated cases reuse identical endpoint syntax. Changing-endpoint cases cycle beyond the two-slot cache capacity. Setup, prepared sampling and numeric interpolation are separate; validation stays outside timing. Cold setup and Bun shadow sampling retain the reported upstream costs.
