# vmaterial-react-table measurements

These are whole-widget server renders in production mode, using Material React
Table 3.2.1 as the control and identical React 19.1/MUI 7.2/Emotion peers. Cases
render 10 rows, page 100 rows to 15, or sort 50 rows and render 15. Expected row
counts and leading values are checked outside timing. The independent widget
uses different markup and a narrower feature scope; these are not identical-HTML
comparisons or browser/application performance measurements.

Node establishes lower time for the basic and paged cases (58.8% and 60.8%).
The sorted case is unestablished because control spread reached 54.7%. Bun
establishes lower time for paged and sorted cases (63.3% and 70.2%); its basic
case reverses direction in one process pair, so its apparent median gain is
unestablished. All samples and both kinds of uncertainty are retained below.

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

Recorded 2026-11-08T22:32:19.502Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Widget SSR 10 rows | 4497710 | 1812396 | -58.8% | -58.8% | -48.2% | 9.7% | lower time in every pair, beyond control spread |
| Widget SSR 100 rows paged | 6092675 | 2383745 | -60.8% | -61.5% | -59.4% | 5.5% | lower time in every pair, beyond control spread |
| Widget SSR 50 rows sorted | 5978495 | 3015136 | -47.6% | -47.6% | -52.5% | 54.7% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-08T22:32:43.999Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Widget SSR 10 rows | 3806011 | 1244190 | -68% | -8.7% | -68% | 12.8% | unestablished at this precision |
| Widget SSR 100 rows paged | 4127128 | 1515463 | -63.3% | -50.9% | -69.5% | 5.6% | lower time in every pair, beyond control spread |
| Widget SSR 50 rows sorted | 3949171 | 1196039 | -70.2% | -60.5% | -70.4% | 2.9% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vmaterial-react-table/bench/results/node-isolated.json node packages/vmaterial-react-table/bench/compare.cjs
OUTPUT=packages/vmaterial-react-table/bench/results/bun-isolated.json bun packages/vmaterial-react-table/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vmaterial-react-table results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
