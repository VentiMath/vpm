# vperfect-scrollbar measurements

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

Recorded 2026-11-13T07:49:10.064Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| construct and destroy desktop scrollbar | 3037603 | 976090 | -68% | -68.5% | -67.6% | 2.9% | lower time in every pair, beyond control spread |
| unchanged geometry update | 1645683 | 794193 | -52% | -50.7% | -54% | 1.5% | lower time in every pair, beyond control spread |
| native scroll event and thumb update | 41384 | 34524 | -16.4% | -15.3% | -22.9% | 0.9% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-13T07:49:36.418Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| construct and destroy desktop scrollbar | 1876808 | 539119 | -71.3% | -72.5% | -69.8% | 9.5% | lower time in every pair, beyond control spread |
| unchanged geometry update | 1074409 | 505446 | -51.6% | -53.8% | -50.6% | 10% | lower time in every pair, beyond control spread |
| native scroll event and thumb update | 24873 | 17752 | -28.1% | -31.7% | -26% | 1% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/run.cjs:

```sh
OUTPUT=packages/vperfect-scrollbar/bench/results/node-isolated.json node packages/vperfect-scrollbar/bench/run.cjs
OUTPUT=packages/vperfect-scrollbar/bench/results/bun-isolated.json bun packages/vperfect-scrollbar/bench/run.cjs
node scripts/render-bench-report.cjs packages/vperfect-scrollbar results run.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
