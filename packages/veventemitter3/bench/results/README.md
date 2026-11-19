# veventemitter3 measurements

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

Recorded 2026-11-19T01:07:35.394Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 listeners, two-argument dispatch | 11 | 15 | 44.7% | 47.4% | 42.1% | 1.2% | higher time in every pair, beyond control spread |
| 8 listeners, two-argument dispatch | 61 | 60 | -1.7% | -2.4% | -0.3% | 1.1% | unestablished at this precision |
| seven-argument dispatch | 150 | 140 | -7.1% | -7.1% | -6.7% | 0.4% | lower time in every pair, beyond control spread |
| once registration and dispatch | 24 | 72 | 206.6% | 211.1% | 201% | 4.3% | higher time in every pair, beyond control spread |
| subscribe, emit and unsubscribe | 86 | 82 | -3.8% | -6.5% | 10.1% | 4.3% | unestablished at this precision |
| construct and clear three subscriptions | 72 | 129 | 79.1% | 81.6% | 74.5% | 2% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-19T01:07:57.890Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 listeners, two-argument dispatch | 1 | 3 | 246.4% | 244.3% | 246.4% | 2.3% | higher time in every pair, beyond control spread |
| 8 listeners, two-argument dispatch | 22 | 22 | -1.8% | -1.1% | -6.6% | 9% | unestablished at this precision |
| seven-argument dispatch | 86 | 57 | -33.9% | -31.4% | -36.3% | 11.5% | lower time in every pair, beyond control spread |
| once registration and dispatch | 26 | 31 | 19.8% | 35.1% | 2.5% | 26.8% | unestablished at this precision |
| subscribe, emit and unsubscribe | 29 | 26 | -13.4% | -11.2% | -31.5% | 3.4% | lower time in every pair, beyond control spread |
| construct and clear three subscriptions | 35 | 36 | 3.4% | 4.5% | -1% | 51.2% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/veventemitter3/bench/results/node-isolated.json node packages/veventemitter3/bench/compare.cjs
OUTPUT=packages/veventemitter3/bench/results/bun-isolated.json bun packages/veventemitter3/bench/compare.cjs
node scripts/render-bench-report.cjs packages/veventemitter3 results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
