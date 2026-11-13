# vmotion measurements

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

Recorded 2026-11-13T22:30:27.711Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Motion14 fade SSR | 22293 | 23739 | 5.9% | 6.9% | 5.6% | 3.5% | higher time in every pair, beyond control spread |
| Motion14 variants SSR | 24827 | 25517 | 2.5% | 2.7% | 2.5% | 1.3% | higher time in every pair, beyond control spread |
| Motion14 initial-false SSR | 22386 | 23306 | 4.8% | 3.2% | 6.5% | 1.8% | higher time in every pair, beyond control spread |
| App12 fade SSR | 21682 | 23367 | 7.8% | 7.8% | 8.5% | 3.4% | higher time in every pair, beyond control spread |
| App12 variants SSR | 25249 | 25052 | -0.8% | -0.2% | -2.2% | 15.6% | unestablished at this precision |
| App12 initial-false SSR | 21998 | 22857 | 4.4% | 4.2% | 6.3% | 8.8% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-13T22:30:52.006Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Motion14 fade SSR | 22260 | 19150 | -14.1% | -14.3% | -14.1% | 2.3% | lower time in every pair, beyond control spread |
| Motion14 variants SSR | 25076 | 21423 | -14.1% | -14.6% | -11.2% | 3% | lower time in every pair, beyond control spread |
| Motion14 initial-false SSR | 20812 | 18667 | -11.1% | -9.7% | -11.1% | 0.1% | lower time in every pair, beyond control spread |
| App12 fade SSR | 20632 | 19265 | -6.2% | -8.7% | -5.3% | 0.9% | lower time in every pair, beyond control spread |
| App12 variants SSR | 23354 | 21551 | -7.7% | -7.1% | -9% | 2.5% | lower time in every pair, beyond control spread |
| App12 initial-false SSR | 19858 | 18596 | -7.3% | -7% | -7.3% | 2.7% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vmotion/bench/results/node-isolated.json node packages/vmotion/bench/compare.cjs
OUTPUT=packages/vmotion/bench/results/bun-isolated.json bun packages/vmotion/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vmotion results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
