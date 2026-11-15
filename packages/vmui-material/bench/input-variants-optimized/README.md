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

Recorded 2026-11-15T02:35:58.748Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 standard SSR | 541533 | 512644 | -5.2% | -5.2% | -5.7% | 1.7% | unestablished at this precision |
| Material9 outlined SSR | 686826 | 627314 | -8.8% | -9.1% | -8.8% | 2.4% | lower time in every pair, beyond control spread |
| Material9 multiline SSR | 814912 | 605158 | -25.7% | -25.8% | -25.7% | 0.9% | lower time in every pair, beyond control spread |
| Material9 form SSR | 974982 | 948056 | -1% | -1% | -4.1% | 4% | unestablished at this precision |
| App7 standard SSR | 501498 | 479024 | -3.8% | -3.4% | -3.8% | 4.5% | unestablished at this precision |
| App7 outlined SSR | 674434 | 595307 | -12.7% | -11.7% | -15% | 2.9% | lower time in every pair, beyond control spread |
| App7 multiline SSR | 790114 | 595578 | -24.8% | -24.8% | -22.3% | 3.8% | lower time in every pair, beyond control spread |
| App7 form SSR | 950019 | 965402 | 1.6% | -2.5% | 4.4% | 3.2% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-15T02:36:35.563Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 standard SSR | 344403 | 305110 | -11.7% | -8.9% | -23.2% | 7.5% | lower time in every pair, beyond control spread |
| Material9 outlined SSR | 486947 | 382082 | -20.4% | -14.8% | -31.5% | 6.8% | lower time in every pair, beyond control spread |
| Material9 multiline SSR | 528745 | 391890 | -25.8% | -25.8% | -26.5% | 9.7% | lower time in every pair, beyond control spread |
| Material9 form SSR | 752688 | 663130 | -11.5% | -11.7% | -11.5% | 5.9% | lower time in every pair, beyond control spread |
| App7 standard SSR | 343334 | 320384 | -7.6% | -5.3% | -9.9% | 2.7% | lower time in every pair, beyond control spread |
| App7 outlined SSR | 456253 | 382877 | -16.7% | -16.7% | -16.1% | 1.3% | lower time in every pair, beyond control spread |
| App7 multiline SSR | 514876 | 385444 | -26.1% | -26.1% | -25.9% | 2.4% | lower time in every pair, beyond control spread |
| App7 form SSR | 721715 | 655184 | -9.7% | -4.6% | -10.9% | 3.9% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/input-variants.cjs:

```sh
OUTPUT=packages/vmui-material/bench/input-variants-optimized/node-isolated.json node packages/vmui-material/bench/input-variants.cjs
OUTPUT=packages/vmui-material/bench/input-variants-optimized/bun-isolated.json bun packages/vmui-material/bench/input-variants.cjs
node scripts/render-bench-report.cjs packages/vmui-material input-variants-optimized input-variants.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
