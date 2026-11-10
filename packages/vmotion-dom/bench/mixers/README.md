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

Recorded 2026-11-10T07:10:48.107Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a repeated color mixer | 476 | 93 | -80.6% | -80.2% | -80.6% | 0.9% | lower time in every pair, beyond control spread |
| sample a prepared color mixer | 100 | 91 | -9% | -8.5% | -9.4% | 0.8% | lower time in every pair, beyond control spread |
| prepare and sample a repeated complex shadow mixer | 2296 | 357 | -84.5% | -84.7% | -84.3% | 1.7% | lower time in every pair, beyond control spread |
| sample a prepared complex shadow mixer | 428 | 354 | -17.1% | -18.3% | -16.4% | 0.3% | lower time in every pair, beyond control spread |
| prepare color mixers with changing uncached endpoints | 667 | 589 | -12.2% | -13% | -11.3% | 3.9% | lower time in every pair, beyond control spread |
| prepare shadow mixers with changing uncached endpoints | 2117 | 1562 | -26.5% | -27.5% | -25.5% | 4.4% | lower time in every pair, beyond control spread |
| sample a prepared numeric interpolation | 14 | 14 | -2.4% | 0.5% | -5.5% | 4% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-10T07:11:22.118Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a repeated color mixer | 428 | 49 | -88.7% | -84.2% | -88.7% | 2.4% | lower time in every pair, beyond control spread |
| sample a prepared color mixer | 54 | 32 | -40.3% | -32.5% | -40.8% | 1.2% | lower time in every pair, beyond control spread |
| prepare and sample a repeated complex shadow mixer | 1780 | 235 | -86.8% | -83.8% | -87.2% | 1.2% | lower time in every pair, beyond control spread |
| sample a prepared complex shadow mixer | 240 | 209 | -11.8% | -12% | -11.8% | 1.5% | lower time in every pair, beyond control spread |
| prepare color mixers with changing uncached endpoints | 557 | 318 | -42.8% | -42.5% | -43.6% | 5.7% | lower time in every pair, beyond control spread |
| prepare shadow mixers with changing uncached endpoints | 1751 | 1095 | -37.4% | -33.9% | -39.8% | 5% | lower time in every pair, beyond control spread |
| sample a prepared numeric interpolation | 11 | 6 | -43.8% | -56.5% | -29.3% | 1.3% | lower time in every pair, beyond control spread |

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
