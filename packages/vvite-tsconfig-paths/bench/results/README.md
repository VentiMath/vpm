# vvite-tsconfig-paths measurements

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

Recorded 2026-11-12T23:03:13.815Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| repeated wildcard alias resolution | 3594 | 2376 | -34% | -29.2% | -37.2% | 5.4% | lower time in every pair, beyond control spread |
| non-alias module lookup | 3678 | 1607 | -56.4% | -54.1% | -60% | 0.8% | lower time in every pair, beyond control spread |
| configuration discovery and plugin setup | 273366 | 169074 | -36.5% | -32.2% | -36.5% | 6% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-12T23:03:28.137Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| repeated wildcard alias resolution | 1562 | 1013 | -35.4% | -31.7% | -37% | 9.6% | lower time in every pair, beyond control spread |
| non-alias module lookup | 1624 | 644 | -60.1% | -59.6% | -60.5% | 3.7% | lower time in every pair, beyond control spread |
| configuration discovery and plugin setup | 184942 | 102553 | -44.5% | -40.1% | -57.6% | 10.3% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/run.cjs:

```sh
OUTPUT=packages/vvite-tsconfig-paths/bench/results/node-isolated.json node packages/vvite-tsconfig-paths/bench/run.cjs
OUTPUT=packages/vvite-tsconfig-paths/bench/results/bun-isolated.json bun packages/vvite-tsconfig-paths/bench/run.cjs
node scripts/render-bench-report.cjs packages/vvite-tsconfig-paths results run.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
