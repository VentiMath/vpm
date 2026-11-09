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

Recorded 2026-11-09T23:25:27.534Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, resolve, seek and stop a synchronous custom animation | 1689 | 1922 | 4.4% | 4.4% | 36.3% | 33.9% | unestablished at this precision |
| create, resolve, seek and stop a deferred custom animation | 2161 | 3097 | 40.2% | 39.5% | 49.5% | 52.9% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-09T23:25:38.763Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, resolve, seek and stop a synchronous custom animation | 1308 | 1762 | 34.8% | 34.8% | 34.3% | 6.4% | higher time in every pair, beyond control spread |
| create, resolve, seek and stop a deferred custom animation | 1471 | 4023 | 173.5% | 185.9% | 167.3% | 1.4% | higher time in every pair, beyond control spread |

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

Both cases own a MotionValue lifecycle, resolve a custom token, seek, stop and drain read-phase disposal. They use equivalent independent resolver subclasses and value sinks. Final Node directions remain inconclusive; both Bun cases retain established overhead. Initial measurements are retained in commit `39547fce`; those sequential recordings alone are not a controlled before/after speedup claim. These workloads exclude browser layout and full React rendering.
