# vradix-react-primitive measurements

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

Recorded 2026-11-03T06:11:08.916Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| module initialization / warm dependencies | 45161 | 7249 | -83% | -82.8% | -84% | 14.5% | lower time in every pair, beyond control spread |
| SSR / native button | 3797 | 3809 | 3.2% | 4.7% | 3.2% | 28.6% | unestablished at this precision |
| SSR / asChild button | 6110 | 5384 | -11.8% | -40.7% | -11.5% | 3.6% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-03T06:11:23.487Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| module initialization / warm dependencies | 18634 | 4353 | -76.4% | -69.2% | -77.8% | 105.2% | unestablished at this precision |
| SSR / native button | 2218 | 2181 | -2.1% | -2.1% | 0.6% | 202.3% | unestablished at this precision |
| SSR / asChild button | 3405 | 3172 | -7.2% | -8.7% | -5.3% | 169.6% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vradix-react-primitive/bench/results/node-isolated.json node packages/vradix-react-primitive/bench/compare.cjs
OUTPUT=packages/vradix-react-primitive/bench/results/bun-isolated.json bun packages/vradix-react-primitive/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-primitive results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
