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

Recorded 2026-11-09T20:39:55.514Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create MotionValue | 19 | 17 | -8% | -9.4% | -7.9% | 8.5% | unestablished at this precision |
| publish to 1 value subscriber | 8 | 8 | 5.3% | 16.4% | -0.2% | 13.2% | unestablished at this precision |
| publish to 32 value subscribers | 106 | 106 | 0.5% | 0.5% | 1.8% | 1.5% | unestablished at this precision |
| schedule and run 32 frame callbacks | 1093 | 1290 | 18.3% | 18.4% | 18.3% | 134.1% | unestablished at this precision |
| schedule and cancel 32 frame callbacks | 6214 | 5170 | -16.8% | -16.8% | -15.2% | 3.4% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T20:40:16.605Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create MotionValue | 26 | 18 | -33.2% | -34% | -32.6% | 2% | lower time in every pair, beyond control spread |
| publish to 1 value subscriber | 10 | 8 | -14.3% | -7.1% | -21.9% | 19.7% | unestablished at this precision |
| publish to 32 value subscribers | 100 | 111 | 12.7% | -2.4% | 29.6% | 33.8% | unestablished at this precision |
| schedule and run 32 frame callbacks | 1157 | 1343 | 15% | 15% | 16.8% | 3.7% | higher time in every pair, beyond control spread |
| schedule and cancel 32 frame callbacks | 4365 | 3858 | -11.6% | -10.9% | -11.9% | 0.9% | lower time in every pair, beyond control spread |

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
