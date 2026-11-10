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

Recorded 2026-11-10T04:26:09.549Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a repeated color mixer | 491 | 97 | -80.3% | -80.3% | -78.2% | 4.3% | lower time in every pair, beyond control spread |
| sample a prepared color mixer | 101 | 102 | 1.4% | 1.4% | 0% | 2.2% | unestablished at this precision |
| prepare and sample a repeated complex shadow mixer | 2365 | 378 | -84% | -83.9% | -84.2% | 1.4% | lower time in every pair, beyond control spread |
| sample a prepared complex shadow mixer | 433 | 438 | 1.8% | 0.9% | 4.3% | 0.4% | unestablished at this precision |
| prepare color mixers with changing uncached endpoints | 678 | 1369 | 101.9% | 97.8% | 102.7% | 6.2% | higher time in every pair, beyond control spread |
| prepare shadow mixers with changing uncached endpoints | 2197 | 3124 | 42.1% | 42.1% | 42% | 2.8% | higher time in every pair, beyond control spread |
| sample a prepared numeric interpolation | 14 | 14 | -2.2% | 0.9% | -5% | 1.4% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-10T04:26:41.408Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a repeated color mixer | 443 | 48 | -89.4% | -88.8% | -89.5% | 4.4% | lower time in every pair, beyond control spread |
| sample a prepared color mixer | 55 | 33 | -39.8% | -40.7% | -37.1% | 4.5% | lower time in every pair, beyond control spread |
| prepare and sample a repeated complex shadow mixer | 1805 | 331 | -82.4% | -82.4% | -51.3% | 4.6% | lower time in every pair, beyond control spread |
| sample a prepared complex shadow mixer | 250 | 294 | 19% | 20.3% | 17.4% | 7% | higher time in every pair, beyond control spread |
| prepare color mixers with changing uncached endpoints | 580 | 964 | 63.1% | 72.8% | 50.9% | 6.3% | higher time in every pair, beyond control spread |
| prepare shadow mixers with changing uncached endpoints | 1767 | 2058 | 14.9% | 18.4% | 7.2% | 2.3% | unestablished at this precision |
| sample a prepared numeric interpolation | 9 | 4 | -56.5% | -45.3% | -61.3% | 9.3% | lower time in every pair, beyond control spread |

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
