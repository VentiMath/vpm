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

Recorded 2026-11-11T18:29:41.799Z on Apple M1 Pro, darwin/arm64.

[Raw samples, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| empty app provider SSR | 1584 | 1552 | -2.4% | 4.8% | unestablished at this precision |
| success notification SSR | 2715 | 2312 | -14.9% | 4.6% | lower time in every pair, beyond control spread |
| notification with action SSR | 3200 | 2667 | -16.5% | 7.5% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-11T18:29:53.969Z on Apple M1 Pro, darwin/arm64.

[Raw samples, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| empty app provider SSR | 1143 | 1128 | -2.5% | 9.5% | unestablished at this precision |
| success notification SSR | 2295 | 1836 | -19.3% | 5.2% | lower time in every pair, beyond control spread |
| notification with action SSR | 2664 | 2455 | -7.8% | 4.2% | unestablished at this precision |

Empty-provider rendering now bypasses anchor-group Map/array allocation while
retaining queue-option validation and the same live context API. The previous
Node recording was 8.2% above upstream; the current 1.552 versus 1.584 μs result
has no established difference. Bun empty-provider time is likewise indistinguishable
at this precision. Node notification content remains 15–17% below upstream; Bun
success content is 19.3% below, while its action-content direction is unestablished.
These are server-rendering measurements, not application or animation speedups.

## Reproduce

```sh
OUTPUT=packages/vnotistack/bench/results/node-isolated.json node packages/vnotistack/bench/run.cjs
OUTPUT=packages/vnotistack/bench/results/bun-isolated.json bun packages/vnotistack/bench/run.cjs
```
