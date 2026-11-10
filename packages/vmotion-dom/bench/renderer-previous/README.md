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

Recorded 2026-11-10T06:45:09.753Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, resolve, seek and stop a synchronous custom animation | 2093 | 1865 | -10.8% | -13% | -9.4% | 13.6% | unestablished at this precision |
| create, resolve, seek and stop a deferred custom animation | 2252 | 2087 | -3.7% | -3.6% | -8.3% | 11.5% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-10T06:45:22.853Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, resolve, seek and stop a synchronous custom animation | 1511 | 1315 | -13.3% | -9.8% | -14.6% | 16.4% | unestablished at this precision |
| create, resolve, seek and stop a deferred custom animation | 1964 | 1892 | -8.4% | 1% | -14.7% | 25.9% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/renderer.cjs:

```sh
VMOTION_RENDERER_PREVIOUS=1 OUTPUT=packages/vmotion-dom/bench/renderer-previous/node-isolated.json node packages/vmotion-dom/bench/renderer.cjs
VMOTION_RENDERER_PREVIOUS=1 OUTPUT=packages/vmotion-dom/bench/renderer-previous/bun-isolated.json bun packages/vmotion-dom/bench/renderer.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom renderer-previous renderer.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.

“Upstream” in this before/after report means immutable VPM commit `ca65b070`, reconstructed by `setup-baseline.cjs`. It is not the upstream Motion package.
