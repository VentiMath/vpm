# vcss-to-react-native measurements

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

Recorded 2026-11-17T23:34:37.393Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| simple declarations | 1596 | 1390 | -13.5% | -13.5% | -35.4% | 27.6% | unestablished at this precision |
| box and border shorthands | 1896 | 1658 | -12.5% | -16.9% | -12.3% | 25% | unestablished at this precision |
| native component style | 4014 | 5970 | 44.5% | 41.5% | 87.3% | 69.3% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-17T23:34:54.129Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| simple declarations | 497 | 280 | -43.9% | -44.1% | -43.9% | 324.8% | unestablished at this precision |
| box and border shorthands | 1424 | 1369 | -3.9% | -2.1% | -8.4% | 34.9% | unestablished at this precision |
| native component style | 3281 | 3970 | 20.5% | 23.1% | 20.1% | 54% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vcss-to-react-native/bench/results/node-isolated.json node packages/vcss-to-react-native/bench/compare.cjs
OUTPUT=packages/vcss-to-react-native/bench/results/bun-isolated.json bun packages/vcss-to-react-native/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vcss-to-react-native results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
