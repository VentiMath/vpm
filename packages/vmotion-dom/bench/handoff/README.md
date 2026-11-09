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

Recorded 2026-11-09T22:40:41.469Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind, transfer and release 1 renderer values | 502 | 1227 | 133.7% | 110.6% | 150.3% | 17.8% | higher time in every pair, beyond control spread |
| bind, transfer and release 8 renderer values | 3179 | 8146 | 156.6% | 161.8% | 148.5% | 30.5% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T22:40:51.536Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind, transfer and release 1 renderer values | 872 | 800 | -8.5% | -8.5% | -1.4% | 3.3% | unestablished at this precision |
| bind, transfer and release 8 renderer values | 4825 | 7866 | 65.8% | 66.6% | 63.2% | 2.2% | higher time in every pair, beyond control spread |

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

## Workload and remaining cost

Both variants bind the same pre-existing values through array-wrapped elements,
transfer them to an independently written renderer with change subscriptions,
remove the destination bindings, and drain read-phase disposal. Array wrapping
keeps cross-runtime subject selection equivalent. No browser layout is timed.

The one-value Node path costs 1.23 μs versus 0.50 μs upstream; eight values cost
8.15 versus 3.18 μs. Bun eight-value transfer costs 7.87 versus 4.83 μs; its
one-value direction is inconclusive. These are remaining costs, not a speedup.
VPM validates destination ownership and stages attachment before releasing source
bindings, allowing restoration on attachment failure. The comparison does not
isolate the cost of these protections from binding, disposal, allocation or GC.
Chrome separately verifies real unchanged upstream HTML/SVG renderers and iframe
ownership; these timings do not establish application frame-rate improvements.
