# vreact-fast-compare measurements

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

Recorded 2026-11-02T00:29:48.803Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| small equal component props | 120 | 94 | -20.9% | -20% | -22.1% | 2.3% | lower time in every pair, beyond control spread |
| changed nested form value | 129 | 188 | 46.1% | 48.1% | 43.3% | 3.4% | higher time in every pair, beyond control spread |
| React children with owner cycles | 715 | 769 | 7.4% | 7.8% | 7.3% | 1.6% | higher time in every pair, beyond control spread |
| Map values and typed bytes | 225 | 252 | 12.1% | 12.5% | 11.7% | 0.4% | higher time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-02T00:30:04.541Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| small equal component props | 36 | 26 | -25.9% | -25.4% | -26.8% | 11.6% | lower time in every pair, beyond control spread |
| changed nested form value | 85 | 67 | -20.4% | -20.4% | -20.7% | 2.3% | lower time in every pair, beyond control spread |
| React children with owner cycles | 296 | 243 | -18% | -11.2% | -18.8% | 1.3% | lower time in every pair, beyond control spread |
| Map values and typed bytes | 118 | 113 | -4.1% | -4.1% | -3.9% | 1.3% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vreact-fast-compare/bench/results/node-isolated.json node packages/vreact-fast-compare/bench/compare.cjs
OUTPUT=packages/vreact-fast-compare/bench/results/bun-isolated.json bun packages/vreact-fast-compare/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vreact-fast-compare results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
