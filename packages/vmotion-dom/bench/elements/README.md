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

Recorded 2026-11-09T23:24:40.085Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, seek and release an element fade | 2558 | 3858 | 21% | 19.4% | 51.5% | 54.2% | unestablished at this precision |
| resolve, seek and release a variable width animation | 4168 | 4645 | 11% | 14.6% | 5.9% | 6.3% | unestablished at this precision |
| seek and paint sixteen element transforms | 3307 | 3600 | 5.6% | -1.6% | 9.2% | 12.5% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-09T23:24:56.708Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, seek and release an element fade | 2128 | 1876 | -10% | -9.6% | -14.1% | 11% | unestablished at this precision |
| resolve, seek and release a variable width animation | 3412 | 5595 | 67.5% | 73.6% | 59.6% | 5.3% | higher time in every pair, beyond control spread |
| seek and paint sixteen element transforms | 2973 | 3142 | 2% | 11.9% | -3.4% | 374.4% | unestablished at this precision |

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

The first two cases include creation, resolution, seek, painting, stop/release and read-phase disposal. The third reuses sixteen paused controllers. JavaScript style sinks exclude browser layout; Chrome separately checks actual DOM and measurements. All directions are inconclusive except the remaining Bun variable-setup overhead.
