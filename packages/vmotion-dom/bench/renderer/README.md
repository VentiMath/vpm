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

Recorded 2026-11-09T23:13:26.607Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, resolve, seek and stop a synchronous custom animation | 1797 | 3417 | 127.6% | 127.6% | 84.8% | 29.2% | higher time in every pair, beyond control spread |
| create, resolve, seek and stop a deferred custom animation | 2044 | 4148 | 106.6% | 94% | 106.6% | 33% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T23:13:39.611Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, resolve, seek and stop a synchronous custom animation | 1399 | 1928 | 42.3% | 43.3% | 36.7% | 3.5% | higher time in every pair, beyond control spread |
| create, resolve, seek and stop a deferred custom animation | 1707 | 5294 | 210% | 238.1% | 185.6% | 7.1% | higher time in every pair, beyond control spread |

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

Both workloads own a MotionValue lifecycle, resolve a custom token, seek, stop and
drain read-phase cleanup. They use the same independent resolver subclass and
JavaScript value sink. The initial implementation is slower on both runtimes;
all process/control samples are retained. These results precede the following
allocation optimization and do not represent browser rendering throughput.
