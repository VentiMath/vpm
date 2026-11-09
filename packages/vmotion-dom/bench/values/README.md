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

Recorded 2026-11-09T18:36:03.066Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create MotionValue | 19 | 17 | -7.9% | -7.9% | -1.7% | 8.6% | unestablished at this precision |
| publish to 1 value subscriber | 8 | 9 | 12.8% | 17.6% | 8.4% | 12.8% | unestablished at this precision |
| publish to 32 value subscribers | 105 | 105 | 0.4% | 0.4% | 1.1% | 2.8% | unestablished at this precision |
| schedule and run 32 frame callbacks | 1080 | 1286 | 18.9% | 18.7% | 20.5% | 8.5% | higher time in every pair, beyond control spread |
| schedule and cancel 32 frame callbacks | 6221 | 5101 | -17.7% | -18.6% | -16.2% | 5.2% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T18:36:23.971Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create MotionValue | 27 | 17 | -34.6% | -35.8% | -33% | 6% | lower time in every pair, beyond control spread |
| publish to 1 value subscriber | 10 | 8 | -15.3% | -7.5% | -23.6% | 17.3% | unestablished at this precision |
| publish to 32 value subscribers | 100 | 111 | 13.9% | -1.1% | 28.3% | 31.1% | unestablished at this precision |
| schedule and run 32 frame callbacks | 1166 | 1321 | 12.6% | 14% | 11.9% | 2.5% | higher time in every pair, beyond control spread |
| schedule and cancel 32 frame callbacks | 4365 | 3816 | -12.1% | -12.4% | -12.1% | 0.8% | lower time in every pair, beyond control spread |

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
