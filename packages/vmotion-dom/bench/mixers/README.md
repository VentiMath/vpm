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

Recorded 2026-11-10T03:58:51.571Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a color mixer | 476 | 740 | 55.2% | 55.3% | 53.8% | 4.6% | higher time in every pair, beyond control spread |
| sample a prepared color mixer | 100 | 101 | 0.9% | 2% | 0.9% | 3.8% | unestablished at this precision |
| prepare and sample a complex shadow mixer | 2295 | 3225 | 40.4% | 39% | 40.5% | 5.6% | higher time in every pair, beyond control spread |
| sample a prepared complex shadow mixer | 444 | 444 | 2.4% | 3.6% | -0.8% | 3.7% | unestablished at this precision |
| sample a prepared numeric interpolation | 15 | 14 | -5.4% | 2.1% | -12.1% | 9.7% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-10T03:59:25.050Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a color mixer | 422 | 611 | 44% | 43.2% | 44.6% | 3.4% | higher time in every pair, beyond control spread |
| sample a prepared color mixer | 54 | 31 | -41.5% | -42% | -40.4% | 3.2% | lower time in every pair, beyond control spread |
| prepare and sample a complex shadow mixer | 1714 | 2022 | 17.4% | 20.3% | 15.6% | 3.5% | higher time in every pair, beyond control spread |
| sample a prepared complex shadow mixer | 235 | 275 | 17% | 15.5% | 20.9% | 1.7% | higher time in every pair, beyond control spread |
| sample a prepared numeric interpolation | 9 | 4 | -56.8% | -56.8% | -57.4% | 6% | lower time in every pair, beyond control spread |

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

Preparation and sampling are measured separately. Prepared Bun color sampling takes less time, while color/shadow preparation and Bun shadow sampling retain costs. Numeric interpolation remains a separate control. CSS percentage, scientific-notation and opaque-URL correctness checks are outside timing.
