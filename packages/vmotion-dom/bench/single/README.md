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

Recorded 2026-11-09T21:27:27.774Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create and stop a scalar animation | 1536 | 1142 | -26.7% | -19.7% | -31% | 13.1% | lower time in every pair, beyond control spread |
| reset, replace and stop a MotionValue animation | 1490 | 1569 | 7.9% | 19.1% | 0.4% | 6.2% | unestablished at this precision |
| deliver repeating single-value updates | 86 | 43 | -47.7% | -53.4% | -45.2% | 5.6% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T21:27:41.752Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create and stop a scalar animation | 390 | 518 | 31.9% | 31.9% | 31.6% | 12.4% | higher time in every pair, beyond control spread |
| reset, replace and stop a MotionValue animation | 353 | 499 | 40.5% | 40.5% | 32.4% | 6.6% | higher time in every pair, beyond control spread |
| deliver repeating single-value updates | 73 | 31 | -57.5% | -57% | -57.8% | 2.2% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/single.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/single/node-isolated.json node packages/vmotion-dom/bench/single.cjs
OUTPUT=packages/vmotion-dom/bench/single/bun-isolated.json bun packages/vmotion-dom/bench/single.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom single single.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
