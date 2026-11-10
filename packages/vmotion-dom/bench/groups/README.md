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

Recorded 2026-11-10T03:09:21.601Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| group, seek, read and stop 1 prepared playback controls | 63 | 55 | -14.4% | -7.2% | -20.5% | 3.1% | lower time in every pair, beyond control spread |
| group, seek, read and stop 8 prepared playback controls | 257 | 121 | -52.5% | -51.9% | -53.9% | 1.8% | lower time in every pair, beyond control spread |
| create and complete a renderer target with transitionEnd | 10745 | 19402 | 80.3% | 106.8% | 58% | 7.2% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-10T03:09:36.700Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| group, seek, read and stop 1 prepared playback controls | 36 | 49 | 30.8% | 30.8% | 36.6% | 3.1% | higher time in every pair, beyond control spread |
| group, seek, read and stop 8 prepared playback controls | 97 | 108 | 10.9% | 15.1% | 6.1% | 1.7% | higher time in every pair, beyond control spread |
| create and complete a renderer target with transitionEnd | 10471 | 13440 | 27.8% | 33.1% | 19.6% | 7.4% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/groups.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/groups/node-isolated.json node packages/vmotion-dom/bench/groups.cjs
OUTPUT=packages/vmotion-dom/bench/groups/bun-isolated.json bun packages/vmotion-dom/bench/groups.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom groups groups.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.

The first two cases isolate forwarding through prepared controls; they exclude
animation construction. Node takes 14.4% and 52.5% less time for one and eight
members. Bun takes 30.8% and 10.9% more (49/108 ns versus 36/97 ns).

The target case constructs two numeric property animations, completes them,
applies display:none through transitionEnd and drains the same twelve frame/
microtask rounds on each implementation. It includes validation, owned snapshots,
completion promises and stale-write protection. Node takes 19.40 μs versus
10.75 μs (80.3% more); Bun takes 13.44 versus 10.47 μs (27.8% more).
These remaining costs are not an application frame-rate measurement. Deferred
custom setup remains a separate unresolved cost in the renderer benchmark.
