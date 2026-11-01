# vclsx measurements

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

Recorded 2026-11-01T18:42:14.354Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| two strings | 33 | 27 | -19.9% | -21.9% | -16% | 9.3% | lower time in every pair, beyond control spread |
| conditional strings | 54 | 57 | 4.5% | -32.4% | 4.5% | 6.1% | unestablished at this precision |
| dictionary / four fields | 55 | 95 | 69.3% | 40.9% | 70.7% | 6.7% | higher time in every pair, beyond control spread |
| mixed nested values | 150 | 166 | 11.1% | -21% | 11.3% | 23.9% | unestablished at this precision |
| MUI button class arguments | 46 | 40 | -13.7% | -37.3% | -13.7% | 38.3% | unestablished at this precision |
| shared arrays | 109 | 107 | -2.1% | -31.5% | -2.1% | 5% | unestablished at this precision |
| 64-level array | 972 | 2453 | 149.6% | 134% | 155.3% | 45.3% | higher time in every pair, beyond control spread |
| lite conditional strings | 66 | 57 | -13.7% | -37% | -13.7% | 51.2% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T18:42:46.477Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| two strings | 36 | 24 | -33.6% | -10.1% | -40.2% | 10.2% | unestablished at this precision |
| conditional strings | 76 | 57 | -25.7% | -18.3% | -29.2% | 17.6% | unestablished at this precision |
| dictionary / four fields | 59 | 52 | -15.7% | -17.9% | -15.7% | 15.9% | unestablished at this precision |
| mixed nested values | 158 | 124 | -16.8% | -20.6% | -12.3% | 4.8% | lower time in every pair, beyond control spread |
| MUI button class arguments | 63 | 49 | -20.9% | -22% | -19.4% | 37.2% | unestablished at this precision |
| shared arrays | 114 | 92 | -20.2% | -38.1% | -11.1% | 18.5% | unestablished at this precision |
| 64-level array | 1165 | 2213 | 83.9% | 76.8% | 93.2% | 54.1% | higher time in every pair, beyond control spread |
| lite conditional strings | 78 | 59 | -26% | -39.9% | -8.7% | 18.3% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vclsx/bench/results/node-isolated.json node packages/vclsx/bench/compare.cjs
OUTPUT=packages/vclsx/bench/results/bun-isolated.json bun packages/vclsx/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vclsx
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
