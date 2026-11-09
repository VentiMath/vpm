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

Recorded 2026-11-09T22:32:09.265Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, seek and release an element fade | 2613 | 4529 | 30.8% | 20.6% | 56.9% | 10% | unestablished at this precision |
| resolve, seek and release a variable width animation | 3817 | 5906 | 45.1% | 77.7% | 10.6% | 3% | unestablished at this precision |
| seek and paint sixteen element transforms | 3406 | 3501 | 3.1% | 5.6% | 0% | 2.1% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-09T22:32:24.162Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, seek and release an element fade | 2089 | 1933 | -7.4% | -5.4% | -9.9% | 6.1% | unestablished at this precision |
| resolve, seek and release a variable width animation | 3408 | 5357 | 59.1% | 59% | 59.1% | 4.4% | higher time in every pair, beyond control spread |
| seek and paint sixteen element transforms | 2933 | 2897 | -0.6% | -0.6% | 1.2% | 8.1% | unestablished at this precision |

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

The first two workloads create, seek, paint, stop and release a controller and drain read-phase cleanup. The last reuses sixteen paused controllers. Style sinks measure JavaScript work, not browser layout or application frame rates. See the [before/after control](../elements-previous/README.md) for the comparison with the prior VPM commit.
