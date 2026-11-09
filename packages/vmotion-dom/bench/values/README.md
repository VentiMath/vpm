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

Recorded 2026-11-09T19:10:11.007Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create MotionValue | 19 | 17 | -6.8% | -6.6% | -7.7% | 7.8% | unestablished at this precision |
| publish to 1 value subscriber | 8 | 8 | 4.8% | 15.2% | -1% | 12% | unestablished at this precision |
| publish to 32 value subscribers | 105 | 105 | 0% | 0.5% | -0.1% | 1.5% | unestablished at this precision |
| schedule and run 32 frame callbacks | 1081 | 1328 | 22.5% | 63% | 21.6% | 2.7% | higher time in every pair, beyond control spread |
| schedule and cancel 32 frame callbacks | 6202 | 5229 | -15.7% | -11.1% | -17.7% | 3% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T19:10:31.845Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create MotionValue | 26 | 18 | -30% | -25.9% | -33.7% | 2.8% | lower time in every pair, beyond control spread |
| publish to 1 value subscriber | 10 | 8 | -14% | -5.5% | -23.3% | 19.3% | unestablished at this precision |
| publish to 32 value subscribers | 102 | 111 | 11.5% | 1.3% | 24.8% | 52% | unestablished at this precision |
| schedule and run 32 frame callbacks | 1138 | 1307 | 13.6% | 16% | 11.4% | 0.8% | higher time in every pair, beyond control spread |
| schedule and cancel 32 frame callbacks | 4365 | 3830 | -12.3% | -8.7% | -12.7% | 2.2% | lower time in every pair, beyond control spread |

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
