# vdecko measurements

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

Recorded 2026-11-19T05:17:39.342Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind function and invoke | 19 | 8 | -56% | -52.2% | -59.2% | 10.2% | lower time in every pair, beyond control spread |
| lazy bound method construction and invoke | 103 | 101 | -1.4% | 0.3% | -3.3% | 3.2% | unestablished at this precision |
| memoized hit across 16 keys | 23 | 20 | -15.2% | -8.6% | -21% | 4.4% | lower time in every pair, beyond control spread |
| memoized construction and miss | 53 | 40 | -24.4% | -24.4% | -24.3% | 0.5% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-19T05:18:11.999Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind function and invoke | 26 | 12 | -54.8% | -54.8% | -54.6% | 0.6% | lower time in every pair, beyond control spread |
| lazy bound method construction and invoke | 36 | 36 | 0.7% | 0.7% | 0.7% | 1% | unestablished at this precision |
| memoized hit across 16 keys | 19 | 11 | -40.7% | -40.7% | -41% | 1% | lower time in every pair, beyond control spread |
| memoized construction and miss | 49 | 26 | -46.7% | -47.4% | -46.5% | 1.2% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vdecko/bench/results/node-isolated.json node packages/vdecko/bench/compare.cjs
OUTPUT=packages/vdecko/bench/results/bun-isolated.json bun packages/vdecko/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vdecko results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
