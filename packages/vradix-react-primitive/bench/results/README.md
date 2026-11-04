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

Recorded 2026-11-04T15:24:50.686Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| module initialization / warm dependencies | 59338 | 7887 | -87% | -87.3% | -87% | 77.6% | lower time in every pair, beyond control spread |
| SSR / native button | 3854 | 3888 | 4.5% | 4.5% | 158.5% | 77.3% | unestablished at this precision |
| SSR / asChild button | 6944 | 5782 | -16.2% | -10.5% | -46.4% | 50.8% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-04T15:25:04.927Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| module initialization / warm dependencies | 19676 | 4365 | -77.7% | -77.6% | -79.1% | 15.5% | lower time in every pair, beyond control spread |
| SSR / native button | 2244 | 2271 | 1.1% | 3% | -3.4% | 9.3% | unestablished at this precision |
| SSR / asChild button | 3644 | 3467 | -6.7% | -0.5% | -14.1% | 27.8% | unestablished at this precision |

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
