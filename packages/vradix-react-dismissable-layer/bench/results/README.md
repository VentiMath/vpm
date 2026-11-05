# vradix-react-dismissable-layer measurements

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

Recorded 2026-11-05T21:50:07.970Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR 8 layers | 40420 | 10202 | -74.2% | -73.3% | -74.2% | 3.2% | lower time in every pair, beyond control spread |
| unchanged 8 layers | 57732 | 19729 | -65.8% | -64.4% | -72.4% | 14.1% | lower time in every pair, beyond control spread |
| outside pointer 8 layers | 44677 | 45018 | 1.3% | 7.2% | -8.1% | 1.5% | unestablished at this precision |
| Escape 8 layers | 5865 | 5946 | 1.4% | 1% | 3.2% | 1.4% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-05T21:50:54.842Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR 8 layers | 15374 | 7133 | -53.5% | -54% | -53.4% | 2.2% | lower time in every pair, beyond control spread |
| unchanged 8 layers | 24261 | 11820 | -51.3% | -54.2% | -49.1% | 4.6% | lower time in every pair, beyond control spread |
| outside pointer 8 layers | 14229 | 13762 | -7.2% | -1.8% | -11.9% | 3.9% | unestablished at this precision |
| Escape 8 layers | 1445 | 1511 | 4.5% | 4.5% | 4.8% | 5.9% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vradix-react-dismissable-layer/bench/results/node-isolated.json node packages/vradix-react-dismissable-layer/bench/compare.cjs
OUTPUT=packages/vradix-react-dismissable-layer/bench/results/bun-isolated.json bun packages/vradix-react-dismissable-layer/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-dismissable-layer results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
