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

Recorded 2026-11-10T03:43:58.167Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, resolve, seek and stop a synchronous custom animation | 1797 | 1634 | -15% | -16.9% | -3.3% | 16.3% | unestablished at this precision |
| create, resolve, seek and stop a deferred custom animation | 2279 | 1967 | 0.7% | -2.8% | 0.7% | 68.8% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-10T03:44:10.419Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, resolve, seek and stop a synchronous custom animation | 1295 | 1462 | 12.1% | 22.8% | 8.9% | 13.4% | unestablished at this precision |
| create, resolve, seek and stop a deferred custom animation | 1489 | 2998 | 101.4% | 117.4% | 86% | 6.7% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/renderer.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/renderer/node-isolated.json node packages/vmotion-dom/bench/renderer.cjs
OUTPUT=packages/vmotion-dom/bench/renderer/bun-isolated.json bun packages/vmotion-dom/bench/renderer.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom renderer renderer.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.

Both cases include an owned lifecycle, custom token resolution, seek, stop and read-phase disposal. Bun deferred setup retains established overhead (~2x upstream); synchronous and Node differences are inconclusive. The separate immutable before/after report establishes lower deferred setup time on Bun.
