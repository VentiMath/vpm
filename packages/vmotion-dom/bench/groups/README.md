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

Recorded 2026-11-10T03:59:51.319Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| group, seek, read and stop 1 prepared playback controls | 62 | 55 | -12.2% | -5.2% | -19.3% | 2.5% | lower time in every pair, beyond control spread |
| group, seek, read and stop 8 prepared playback controls | 256 | 119 | -53.5% | -53.9% | -52.9% | 2.1% | lower time in every pair, beyond control spread |
| create and complete a renderer target with transitionEnd | 11188 | 11388 | -10% | 4.5% | -10% | 21.3% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-10T04:00:05.567Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| group, seek, read and stop 1 prepared playback controls | 38 | 49 | 30% | 27.7% | 30% | 14.5% | unestablished at this precision |
| group, seek, read and stop 8 prepared playback controls | 97 | 108 | 13.3% | 14.8% | 12% | 3.6% | higher time in every pair, beyond control spread |
| create and complete a renderer target with transitionEnd | 11245 | 10286 | -13.9% | -9.5% | -13.9% | 3.7% | unestablished at this precision |

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

Forwarding cases use prepared controls. The target case includes two numeric animations, completion, display:none and the same twelve frame/microtask drains for both implementations. Target directions remain inconclusive, and the previous established Node regression is not reproduced. Bun eight-member forwarding still costs more.
