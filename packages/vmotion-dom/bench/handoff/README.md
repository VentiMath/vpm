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

Recorded 2026-11-09T23:25:06.945Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind, transfer and release 1 renderer values | 496 | 1163 | 132.8% | 126.5% | 145.9% | 22% | higher time in every pair, beyond control spread |
| bind, transfer and release 8 renderer values | 3188 | 7483 | 138.5% | 163.7% | 104.2% | 26.8% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T23:25:16.663Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind, transfer and release 1 renderer values | 801 | 781 | -2.3% | -3.4% | 1.3% | 5.9% | unestablished at this precision |
| bind, transfer and release 8 renderer values | 4741 | 7755 | 63.6% | 65.7% | 56.8% | 4.5% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/handoff.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/handoff/node-isolated.json node packages/vmotion-dom/bench/handoff.cjs
OUTPUT=packages/vmotion-dom/bench/handoff/bun-isolated.json bun packages/vmotion-dom/bench/handoff.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom handoff handoff.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.

Both variants bind the same pre-existing values through array-wrapped elements, transfer to an independent renderer with change subscriptions, remove destination bindings and drain read-phase disposal. This combines binding, ownership transfer and cleanup; it does not isolate validation/rollback overhead. See the [prior VPM comparison](../handoff-previous/README.md), whose directions remain inconclusive. No application frame-rate claim is made.
