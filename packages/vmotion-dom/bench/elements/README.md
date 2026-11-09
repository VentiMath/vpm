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

Recorded 2026-11-09T22:00:48.523Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, seek and release an element fade | 6435 | 13651 | 248.4% | 137.1% | 364.4% | 544.7% | unestablished at this precision |
| resolve, seek and release a variable width animation | 7330 | 24010 | 259.2% | 114.2% | 424.9% | 63.9% | higher time in every pair, beyond control spread |
| seek and paint sixteen element transforms | 4742 | 5982 | 27.8% | -3.1% | 54.3% | 75.8% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-09T22:00:26.851Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, seek and release an element fade | 4734 | 4133 | 1.8% | 44.1% | -33.7% | 66.9% | unestablished at this precision |
| resolve, seek and release a variable width animation | 7955 | 10295 | 38.7% | 50.1% | 29% | 19.4% | unestablished at this precision |
| seek and paint sixteen element transforms | 4114 | 3796 | -1.8% | -16.3% | -1.8% | 50% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/elements.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/elements/node-isolated.json node packages/vmotion-dom/bench/elements.cjs
OUTPUT=packages/vmotion-dom/bench/elements/bun-isolated.json bun packages/vmotion-dom/bench/elements.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom elements elements.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.

## Workloads

The first two cases create, seek, paint, stop and release an element animation,
then drain deferred read-phase cleanup for both implementations. The third reuses
sixteen paused controllers and seeks/flushes their transforms. These are explicit
JavaScript control and serialization workloads with style sinks; no browser paint,
layout or application frame rate is timed. Chrome separately verifies actual
frames, calendar spring coefficients, SVG and responsive layout endpoints.
All final control variation and inconclusive directions are retained.
