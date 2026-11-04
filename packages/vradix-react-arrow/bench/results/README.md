# vradix-react-arrow measurements

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

Recorded 2026-11-04T15:25:27.164Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR default arrow | 2428 | 2294 | -3.5% | 1.6% | -6.8% | 30.8% | unestablished at this precision |
| SSR slotted arrow | 3688 | 3175 | -14.1% | -13.9% | -14.1% | 16.6% | unestablished at this precision |
| 20 unchanged arrows | 29105 | 26142 | -9% | -7.4% | -10% | 9.1% | unestablished at this precision |
| 20 resized arrows | 46984 | 46603 | -1.7% | -1.7% | 50.3% | 25.6% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-04T15:25:51.255Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR default arrow | 2348 | 2354 | 3.8% | 3.8% | 24.2% | 6.3% | unestablished at this precision |
| SSR slotted arrow | 3509 | 3498 | -9% | -9% | -10.4% | 13.3% | unestablished at this precision |
| 20 unchanged arrows | 18156 | 18814 | 0.5% | -3% | 30.7% | 2.2% | unestablished at this precision |
| 20 resized arrows | 31469 | 33120 | 9.5% | 25.2% | 9.5% | 3.7% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vradix-react-arrow/bench/results/node-isolated.json node packages/vradix-react-arrow/bench/compare.cjs
OUTPUT=packages/vradix-react-arrow/bench/results/bun-isolated.json bun packages/vradix-react-arrow/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-arrow results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
