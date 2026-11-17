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

Recorded 2026-11-17T08:52:50.728Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 closed Slide SSR | 147323 | 105916 | -27.6% | -28.4% | -27% | 2% | lower time in every pair, beyond control spread |
| Material9 open Slide SSR | 145784 | 103161 | -28.5% | -27.7% | -30.5% | 2.8% | lower time in every pair, beyond control spread |
| Material9 settled Slide SSR | 144347 | 101958 | -29.2% | -29.2% | -29.7% | 2.9% | lower time in every pair, beyond control spread |
| App7 closed Slide SSR | 141140 | 98735 | -30% | -29% | -31.5% | 12.6% | lower time in every pair, beyond control spread |
| App7 open Slide SSR | 141532 | 99552 | -29.7% | -29.5% | -29.9% | 4.1% | lower time in every pair, beyond control spread |
| App7 settled Slide SSR | 139584 | 97915 | -29.8% | -29.3% | -29.8% | 0.8% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-17T08:53:31.208Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 closed Slide SSR | 83139 | 47723 | -42% | -41.7% | -42.6% | 2.5% | lower time in every pair, beyond control spread |
| Material9 open Slide SSR | 82478 | 50489 | -37.8% | -37.8% | -40.2% | 3.6% | lower time in every pair, beyond control spread |
| Material9 settled Slide SSR | 81711 | 49065 | -39.9% | -38.7% | -40.1% | 3.2% | lower time in every pair, beyond control spread |
| App7 closed Slide SSR | 82314 | 46588 | -42.3% | -37.6% | -44.6% | 8% | lower time in every pair, beyond control spread |
| App7 open Slide SSR | 80188 | 46164 | -42.7% | -41.7% | -42.7% | 6.3% | lower time in every pair, beyond control spread |
| App7 settled Slide SSR | 80419 | 45360 | -43.5% | -41.1% | -44.9% | 9.4% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/slide.cjs:

```sh
OUTPUT=packages/vmui-material/bench/slide/node-isolated.json node packages/vmui-material/bench/slide.cjs
OUTPUT=packages/vmui-material/bench/slide/bun-isolated.json bun packages/vmui-material/bench/slide.cjs
node scripts/render-bench-report.cjs packages/vmui-material slide slide.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
