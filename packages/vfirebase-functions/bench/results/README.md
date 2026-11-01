# vfirebase-functions measurements

These records supersede the earlier same-process comparison. Each timed
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
Negative changes mean less time; these are local CPU measurements, not
application throughput or latency guarantees.

## Node 24.22.1

Recorded 2026-11-01T08:34:49.545Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 487 | 347 | -28.6% | -15.6% | -30.3% | 1.2% | lower time in every pair, beyond control spread |
| logger / structured request | 594 | 633 | 6.5% | 10% | -0.5% | 5.1% | unestablished at this precision |
| logger / nested data | 6515 | 4305 | -33.8% | -27.8% | -35.1% | 5% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 51 | 57 | 10.8% | 12% | 10.8% | 2.6% | higher time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T08:35:05.561Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 581 | 566 | -4% | 0.3% | -4% | 1.4% | unestablished at this precision |
| logger / structured request | 249 | 261 | 5% | 3.7% | 5% | 6% | unestablished at this precision |
| logger / nested data | 7216 | 3838 | -46.3% | -58.4% | -45.9% | 1.5% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 66 | 72 | 9.9% | 9.9% | 9.6% | 8.7% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vfirebase-functions/bench/results/node-isolated.json node packages/vfirebase-functions/bench/compare.cjs
OUTPUT=packages/vfirebase-functions/bench/results/bun-isolated.json bun packages/vfirebase-functions/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vfirebase-functions
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
