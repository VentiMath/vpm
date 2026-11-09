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

Recorded 2026-11-09T20:51:28.628Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create MotionValue | 19 | 18 | -5.9% | -7.6% | -5.9% | 3% | lower time in every pair, beyond control spread |
| publish to 1 value subscriber | 8 | 9 | 13% | 23.9% | 1.1% | 12.2% | unestablished at this precision |
| publish to 32 value subscribers | 106 | 107 | 1.2% | 1.9% | 0.5% | 1.4% | unestablished at this precision |
| schedule and run 32 frame callbacks | 1090 | 1296 | 18.9% | 21.9% | 18.4% | 7.1% | higher time in every pair, beyond control spread |
| schedule and cancel 32 frame callbacks | 6197 | 5280 | -15.7% | -15.7% | -15.1% | 1.9% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T20:51:49.739Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create MotionValue | 27 | 17 | -35% | -35% | -35.8% | 5.4% | lower time in every pair, beyond control spread |
| publish to 1 value subscriber | 10 | 8 | -16.5% | -8.7% | -24.6% | 16.1% | unestablished at this precision |
| publish to 32 value subscribers | 102 | 110 | 9.4% | -2.2% | 23.7% | 28.9% | unestablished at this precision |
| schedule and run 32 frame callbacks | 1200 | 1351 | 13.6% | 17% | 10.3% | 3.8% | higher time in every pair, beyond control spread |
| schedule and cancel 32 frame callbacks | 4418 | 3864 | -11.6% | -11.6% | -13.8% | 7% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/values.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/values/node-isolated.json node packages/vmotion-dom/bench/values.cjs
OUTPUT=packages/vmotion-dom/bench/values/bun-isolated.json bun packages/vmotion-dom/bench/values.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom values values.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
