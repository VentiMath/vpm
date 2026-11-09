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

Recorded 2026-11-09T20:22:13.494Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create numeric keyframe generator | 245 | 25 | -90% | -83.8% | -90.3% | 9% | lower time in every pair, beyond control spread |
| sample numeric keyframe generator | 10 | 11 | 6.8% | 16.7% | -1.5% | 4% | unestablished at this precision |
| create and dispose paused playback | 503 | 228 | -53.8% | -56.2% | -40.4% | 15.4% | lower time in every pair, beyond control spread |
| advance repeating numeric playback | 73 | 36 | -51.1% | -51.1% | -47.2% | 4.1% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T20:22:31.287Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create numeric keyframe generator | 47 | 21 | -54.5% | -55.3% | -54.1% | 33.6% | lower time in every pair, beyond control spread |
| sample numeric keyframe generator | 4 | 3 | -23.6% | -41% | -23.6% | 4.8% | lower time in every pair, beyond control spread |
| create and dispose paused playback | 87 | 122 | 42.2% | 49.3% | 35.8% | 5.6% | higher time in every pair, beyond control spread |
| advance repeating numeric playback | 55 | 23 | -59.1% | -57.4% | -60.6% | 5.5% | lower time in every pair, beyond control spread |

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
