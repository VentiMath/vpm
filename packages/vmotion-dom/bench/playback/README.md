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

Recorded 2026-11-09T20:52:10.866Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create numeric keyframe generator | 241 | 24 | -90% | -90.1% | -90% | 0.9% | lower time in every pair, beyond control spread |
| sample numeric keyframe generator | 10 | 12 | 8.9% | 14.3% | 4.7% | 8.1% | unestablished at this precision |
| create and dispose paused playback | 491 | 186 | -62.6% | -64.9% | -38.4% | 4.2% | lower time in every pair, beyond control spread |
| advance repeating numeric playback | 70 | 35 | -49.1% | -50.4% | -49.1% | 2.7% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T20:52:27.773Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create numeric keyframe generator | 44 | 22 | -51.7% | -51.8% | -47.3% | 14.6% | lower time in every pair, beyond control spread |
| sample numeric keyframe generator | 4 | 3 | -19.7% | -19.2% | -20.3% | 0.6% | lower time in every pair, beyond control spread |
| create and dispose paused playback | 85 | 121 | 41.2% | 48.5% | 33.6% | 3.2% | higher time in every pair, beyond control spread |
| advance repeating numeric playback | 56 | 24 | -58.7% | -61.1% | -58.4% | 1.6% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/playback.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/playback/node-isolated.json node packages/vmotion-dom/bench/playback.cjs
OUTPUT=packages/vmotion-dom/bench/playback/bun-isolated.json bun packages/vmotion-dom/bench/playback.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom playback playback.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
