# vfloating-ui-core measurements

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

Recorded 2026-11-01T21:40:34.850Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| position / plain | 295 | 542 | 94.2% | 95.1% | 55.5% | 39.7% | unestablished at this precision |
| position / popover | 2730 | 3987 | 24.3% | 63% | 3.5% | 57.6% | unestablished at this precision |
| position / tooltip | 17138 | 14357 | -10.2% | -10.2% | -16.5% | 106.6% | unestablished at this precision |
| position / dropdown | 13883 | 13575 | -22.2% | 84.1% | -22.2% | 45.7% | unestablished at this precision |
| position / arrow | 13459 | 11235 | -17% | -38.1% | -16.3% | 46.8% | unestablished at this precision |
| position / auto | 16447 | 9715 | -43.9% | -48% | -37.9% | 62.5% | unestablished at this precision |
| position / inline | 2012 | 1857 | -7.1% | 20.2% | -16.9% | 379.6% | unestablished at this precision |
| position / size | 3151 | 4769 | 39.5% | 39.5% | 342.7% | 207.2% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T21:41:21.550Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| position / plain | 218 | 390 | 77.1% | 77.1% | 22.2% | 85% | unestablished at this precision |
| position / popover | 4401 | 3814 | -12.8% | -12.8% | -28.2% | 383% | unestablished at this precision |
| position / tooltip | 19602 | 15115 | -33.7% | -18.7% | -41.8% | 291.6% | unestablished at this precision |
| position / dropdown | 18215 | 18507 | 19.5% | 19.5% | -0.6% | 67.7% | unestablished at this precision |
| position / arrow | 14327 | 18465 | -12.2% | 88.3% | -51% | 65.6% | unestablished at this precision |
| position / auto | 29576 | 14219 | -30.1% | -36.2% | -30.1% | 387.1% | unestablished at this precision |
| position / inline | 3223 | 1865 | -30.2% | -30.2% | -24.3% | 15.4% | unestablished at this precision |
| position / size | 2074 | 4726 | 45% | 163.6% | -22.2% | 43.8% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vfloating-ui-core/bench/results/node-isolated.json node packages/vfloating-ui-core/bench/compare.cjs
OUTPUT=packages/vfloating-ui-core/bench/results/bun-isolated.json bun packages/vfloating-ui-core/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vfloating-ui-core
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
