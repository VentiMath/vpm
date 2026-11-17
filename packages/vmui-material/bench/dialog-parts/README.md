# vmui-material measurements

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

Recorded 2026-11-17T07:20:30.961Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 title dialog structure SSR | 43031 | 21877 | -49.2% | -45.3% | -49.2% | 1.7% | lower time in every pair, beyond control spread |
| Material9 confirmation dialog structure SSR | 50298 | 25676 | -49% | -49.6% | -48.4% | 0.4% | lower time in every pair, beyond control spread |
| Material9 contact dialog structure SSR | 55376 | 30073 | -45.7% | -45.7% | -45.7% | 2.1% | lower time in every pair, beyond control spread |
| App7 title dialog structure SSR | 42962 | 18034 | -58.1% | -53.3% | -61% | 0.7% | lower time in every pair, beyond control spread |
| App7 confirmation dialog structure SSR | 49899 | 22934 | -53.9% | -53.7% | -55% | 1.1% | lower time in every pair, beyond control spread |
| App7 contact dialog structure SSR | 56756 | 27361 | -51.8% | -52.6% | -47.5% | 1.2% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-17T07:20:57.181Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 title dialog structure SSR | 25267 | 11006 | -56.6% | -56.9% | -56% | 6.9% | lower time in every pair, beyond control spread |
| Material9 confirmation dialog structure SSR | 32942 | 16510 | -50% | -49.7% | -50% | 2.6% | lower time in every pair, beyond control spread |
| Material9 contact dialog structure SSR | 36438 | 20462 | -43.6% | -43.6% | -43.6% | 5.2% | lower time in every pair, beyond control spread |
| App7 title dialog structure SSR | 28616 | 10744 | -62.5% | -62.2% | -62.6% | 9% | lower time in every pair, beyond control spread |
| App7 confirmation dialog structure SSR | 36071 | 16680 | -53.8% | -52% | -55.8% | 4.4% | lower time in every pair, beyond control spread |
| App7 contact dialog structure SSR | 41414 | 20067 | -51.8% | -51.8% | -51.9% | 1.4% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/dialog-parts.cjs:

```sh
OUTPUT=packages/vmui-material/bench/dialog-parts/node-isolated.json node packages/vmui-material/bench/dialog-parts.cjs
OUTPUT=packages/vmui-material/bench/dialog-parts/bun-isolated.json bun packages/vmui-material/bench/dialog-parts.cjs
node scripts/render-bench-report.cjs packages/vmui-material dialog-parts dialog-parts.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
