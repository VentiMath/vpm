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

These cases render production React 19.3.1 server markup. They measure provider
setup and notification content, not browser paint, queue latency or frame rate.
Both controls use the same bundler and React. The content cases hide icons in both
implementations so different icon artwork is not mistaken for a runtime gain.

## Node 24.22.1

Recorded 2026-11-11T13:48:22.054Z on Apple M1 Pro, darwin/arm64.

[Raw samples, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| empty app provider SSR | 1553 | 1680 | 8.2% | 3.8% | higher time in every pair, beyond control spread |
| success notification SSR | 2727 | 2231 | -18.1% | 3% | lower time in every pair, beyond control spread |
| notification with action SSR | 3183 | 2629 | -17% | 3.2% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-11T13:48:33.990Z on Apple M1 Pro, darwin/arm64.

[Raw samples, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| empty app provider SSR | 1142 | 1244 | 8.6% | 27.5% | unestablished at this precision |
| success notification SSR | 2315 | 1909 | -16.9% | 17.9% | unestablished at this precision |
| notification with action SSR | 2746 | 2461 | -8.7% | 2.1% | unestablished at this precision |

Node notification content takes 17–18% less time in this recording. Empty-provider
SSR takes 8.2% more time (1.680 versus 1.553 μs). Bun directions remain unestablished
because of control spread or process-order variation. No overall application
performance claim follows from these measurements.

## Reproduce

```sh
OUTPUT=packages/vnotistack/bench/results/node-isolated.json node packages/vnotistack/bench/run.cjs
OUTPUT=packages/vnotistack/bench/results/bun-isolated.json bun packages/vnotistack/bench/run.cjs
```
