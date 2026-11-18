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

Recorded 2026-11-18T00:47:53.520Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| raw value helper | 293 | 254 | -13.7% | -17.9% | -13.7% | 3.5% | lower time in every pair, beyond control spread |
| functional color shorthands | 2508 | 4522 | 96.4% | 30.6% | 128.4% | 15.2% | unestablished at this precision |
| simple declarations | 1571 | 1426 | -8.7% | -8% | -16.3% | 82.1% | unestablished at this precision |
| box and border shorthands | 1917 | 1878 | 0.1% | -36.4% | 2.6% | 31.2% | unestablished at this precision |
| native component style | 3990 | 5330 | 32.1% | 9.2% | 32.7% | 4.4% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-18T00:48:14.347Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| raw value helper | 25 | 18 | -34.4% | -35.3% | -29.9% | 27.7% | unestablished at this precision |
| functional color shorthands | 3049 | 3634 | 34.6% | 42.4% | 34.6% | 26.5% | unestablished at this precision |
| simple declarations | 740 | 413 | -50.5% | -43.7% | -52.3% | 14.4% | lower time in every pair, beyond control spread |
| box and border shorthands | 1908 | 1843 | -3.6% | -30.4% | 9.8% | 15.7% | unestablished at this precision |
| native component style | 5313 | 5466 | 10.7% | -8.4% | 10.7% | 16.2% | unestablished at this precision |

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
