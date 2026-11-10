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

Recorded 2026-11-10T04:00:15.027Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, resolve, seek and stop a synchronous custom animation | 1743 | 1396 | -16.7% | -16.8% | -1.5% | 16.6% | unestablished at this precision |
| create, resolve, seek and stop a deferred custom animation | 2302 | 2148 | -8.1% | -7% | -15.9% | 26% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-10T04:00:25.040Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, resolve, seek and stop a synchronous custom animation | 1235 | 1411 | 14.1% | 20.5% | 8.8% | 3.4% | higher time in every pair, beyond control spread |
| create, resolve, seek and stop a deferred custom animation | 1433 | 2511 | 76.3% | 97.8% | 71.4% | 5.5% | higher time in every pair, beyond control spread |

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

Both custom-resolver cases include creation, resolution, seek and stop. Final sources include the color/complex mixer integration. Node directions remain inconclusive; Bun synchronous/deferred cases cost 14.1%/76.3% more. The separate immutable before/after recording establishes a 42.9% Bun deferred improvement against 3365200d; it does not eliminate this residual cost.
