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

Recorded 2026-11-10T07:26:27.185Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind, update, flush and detach 1 custom values | 325 | 844 | 156% | 156.1% | 156% | 25.3% | higher time in every pair, beyond control spread |
| create, seek, flush and stop 1 custom property animations | 2528 | 4390 | 81.4% | 69.4% | 84% | 5.8% | higher time in every pair, beyond control spread |
| bind, update, flush and detach 8 custom values | 2100 | 4967 | 133% | 107.2% | 140.5% | 5.3% | higher time in every pair, beyond control spread |
| create, seek, flush and stop 8 custom property animations | 19873 | 27010 | 27.4% | 46.2% | -2.5% | 20.3% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-10T07:26:46.963Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind, update, flush and detach 1 custom values | 358 | 472 | 31.6% | 36.1% | 31.4% | 4.6% | higher time in every pair, beyond control spread |
| create, seek, flush and stop 1 custom property animations | 1796 | 2585 | 47% | 74.8% | 43.4% | 98.4% | unestablished at this precision |
| bind, update, flush and detach 8 custom values | 2652 | 5406 | 104.5% | 102.1% | 104.5% | 32.4% | higher time in every pair, beyond control spread |
| create, seek, flush and stop 8 custom property animations | 15847 | 17389 | 10.4% | 40.3% | 10.3% | 5.4% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/custom-effects.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/custom-effects/node-isolated.json node packages/vmotion-dom/bench/custom-effects.cjs
OUTPUT=packages/vmotion-dom/bench/custom-effects/bun-isolated.json bun packages/vmotion-dom/bench/custom-effects.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom custom-effects custom-effects.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
