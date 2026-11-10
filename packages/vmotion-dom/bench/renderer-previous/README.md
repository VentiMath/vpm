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

Recorded 2026-11-10T03:42:52.999Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, resolve, seek and stop a synchronous custom animation | 1925 | 1846 | -1.8% | -8.8% | -1.8% | 10.1% | unestablished at this precision |
| create, resolve, seek and stop a deferred custom animation | 2481 | 2230 | -9.6% | -3.2% | -9.6% | 11.1% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-10T03:43:09.804Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, resolve, seek and stop a synchronous custom animation | 1751 | 1417 | -18.7% | -14.8% | -18.7% | 6.2% | unestablished at this precision |
| create, resolve, seek and stop a deferred custom animation | 4818 | 2684 | -42.9% | -40.9% | -42.9% | 14.3% | lower time in every pair, beyond control spread |

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

The upstream columns here are immutable VPM commit `3365200d5149723e870fb93bf217f8be82346226`, reconstructed from git history. This is a before/after comparison, not the upstream package. All pairs and controls are retained.
