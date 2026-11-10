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

Recorded 2026-11-10T02:52:04.309Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, resolve, seek and stop a synchronous custom animation | 3231 | 1864 | -39.9% | -39.5% | -42.2% | 13.2% | lower time in every pair, beyond control spread |
| create, resolve, seek and stop a deferred custom animation | 3453 | 2917 | -11.2% | 3.5% | -27.9% | 23.8% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-10T02:51:47.540Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, resolve, seek and stop a synchronous custom animation | 2064 | 1714 | -16.7% | -12.1% | -21.5% | 5.5% | lower time in every pair, beyond control spread |
| create, resolve, seek and stop a deferred custom animation | 4677 | 4507 | -14.5% | -14.5% | -14.4% | 21.4% | unestablished at this precision |

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

The upstream columns in this report are VPM commit `d45f59d3bbba2917e2d60fd0a025f2c7b6491bfe`, reconstructed from git history. Synchronous setup improves on both runtimes; deferred improvements remain unestablished. Measurements experienced variable host load, which is reflected in pair and identical-source controls.
