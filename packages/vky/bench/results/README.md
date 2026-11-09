# vky measurements

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

Recorded 2026-11-09T10:27:51.838Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create client | 1571 | 695 | -56.1% | -56.4% | -56.1% | 1% | lower time in every pair, beyond control spread |
| GET JSON | 37212 | 20485 | -45.3% | -47.7% | -42.2% | 5.7% | lower time in every pair, beyond control spread |
| POST JSON | 48938 | 38464 | -21.2% | -25.5% | -19.3% | 14% | lower time in every pair, beyond control spread |
| HTTP error JSON | 38175 | 27410 | -28.2% | -32.7% | -25.4% | 2.4% | lower time in every pair, beyond control spread |
| retry 503 | 1642918 | 43531 | -97.3% | -97.2% | -97.5% | 17.4% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T10:28:39.503Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create client | 913 | 353 | -61.6% | -62.3% | -61.1% | 40.4% | lower time in every pair, beyond control spread |
| GET JSON | 14445 | 10365 | -27.2% | -26.3% | -28.5% | 1.8% | lower time in every pair, beyond control spread |
| POST JSON | 14925 | 11485 | -23.5% | -23.5% | -23% | 2.7% | lower time in every pair, beyond control spread |
| HTTP error JSON | 22489 | 13958 | -37.8% | -47.7% | -36.5% | 7.7% | lower time in every pair, beyond control spread |
| retry 503 | 1648926 | 18667 | -98.8% | -98.9% | -98.8% | 18.5% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vky/bench/results/node-isolated.json node packages/vky/bench/compare.cjs
OUTPUT=packages/vky/bench/results/bun-isolated.json bun packages/vky/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vky results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
