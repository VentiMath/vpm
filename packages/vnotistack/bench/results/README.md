# vnotistack measurements

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

Recorded 2026-11-13T07:46:54.344Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| empty app provider SSR | 1556 | 1562 | 0.4% | 2.3% | -2% | 1.8% | unestablished at this precision |
| success notification SSR | 2706 | 2233 | -17.5% | -18.3% | -15% | 1.1% | lower time in every pair, beyond control spread |
| notification with action SSR | 3165 | 2637 | -16.7% | -17.2% | -16.7% | 1.8% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-13T07:47:06.347Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| empty app provider SSR | 1138 | 1117 | -0.9% | -2.3% | 2% | 3.7% | unestablished at this precision |
| success notification SSR | 2314 | 1865 | -18.3% | -17.8% | -20.2% | 0.7% | lower time in every pair, beyond control spread |
| notification with action SSR | 2781 | 2342 | -15.2% | -12% | -18.1% | 6.4% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/run.cjs:

```sh
OUTPUT=packages/vnotistack/bench/results/node-isolated.json node packages/vnotistack/bench/run.cjs
OUTPUT=packages/vnotistack/bench/results/bun-isolated.json bun packages/vnotistack/bench/run.cjs
node scripts/render-bench-report.cjs packages/vnotistack results run.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
