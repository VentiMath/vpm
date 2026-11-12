# vi18next measurements

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

Recorded 2026-11-12T21:48:37.480Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| contest label | 1308 | 261 | -80.1% | -80.7% | -79.6% | 25.1% | lower time in every pair, beyond control spread |
| count and name interpolation | 3285 | 1001 | -69.3% | -69% | -69.7% | 2.4% | lower time in every pair, beyond control spread |
| plural problem count | 2865 | 960 | -66.4% | -66.4% | -66.4% | 4.5% | lower time in every pair, beyond control spread |
| regional locale fallback | 1678 | 415 | -75.3% | -75.3% | -75.3% | 2% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-12T21:49:28.171Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| contest label | 1330 | 234 | -82.6% | -81% | -83.2% | 2.2% | lower time in every pair, beyond control spread |
| count and name interpolation | 3374 | 979 | -70.5% | -72.7% | -69.3% | 5.9% | lower time in every pair, beyond control spread |
| plural problem count | 3060 | 828 | -73.2% | -74.1% | -73.1% | 3.3% | lower time in every pair, beyond control spread |
| regional locale fallback | 1553 | 357 | -77% | -76.8% | -77% | 5.3% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/run.cjs:

```sh
OUTPUT=packages/vi18next/bench/results/node-isolated.json node packages/vi18next/bench/run.cjs
OUTPUT=packages/vi18next/bench/results/bun-isolated.json bun packages/vi18next/bench/run.cjs
node scripts/render-bench-report.cjs packages/vi18next results run.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
