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

Recorded 2026-11-15T06:00:11.885Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 standard Select SSR | 1860510 | 1427436 | -22.5% | -22% | -23.8% | 4.4% | lower time in every pair, beyond control spread |
| Material9 outlined Select SSR | 2038785 | 1497993 | -26.5% | -23.8% | -28.1% | 3.6% | lower time in every pair, beyond control spread |
| Material9 multiple Select SSR | 2147448 | 1539531 | -27.6% | -28% | -27.3% | 3.4% | lower time in every pair, beyond control spread |
| Material9 field Select SSR | 2909514 | 2294581 | -21.4% | -17.7% | -24.9% | 8.6% | lower time in every pair, beyond control spread |
| App7 standard Select SSR | 1674947 | 1261611 | -24.8% | -21.5% | -25.2% | 4% | lower time in every pair, beyond control spread |
| App7 outlined Select SSR | 1908445 | 1416211 | -25.6% | -25.6% | -26.5% | 4.3% | lower time in every pair, beyond control spread |
| App7 multiple Select SSR | 1905238 | 1436798 | -24.3% | -22.9% | -26.9% | 3.2% | lower time in every pair, beyond control spread |
| App7 field Select SSR | 2840046 | 2277168 | -19.6% | -19.2% | -20.3% | 68.3% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-15T06:00:52.702Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 standard Select SSR | 1083490 | 731041 | -32.7% | -32% | -33.1% | 4.5% | lower time in every pair, beyond control spread |
| Material9 outlined Select SSR | 1246525 | 856613 | -31.2% | -31.2% | -31.4% | 4.6% | lower time in every pair, beyond control spread |
| Material9 multiple Select SSR | 1211318 | 833731 | -30.7% | -32.5% | -28.3% | 2.5% | lower time in every pair, beyond control spread |
| Material9 field Select SSR | 1856449 | 1453721 | -20.6% | -22.5% | -20.6% | 1.7% | lower time in every pair, beyond control spread |
| App7 standard Select SSR | 1064481 | 737874 | -30.7% | -32.2% | -29.1% | 6.4% | lower time in every pair, beyond control spread |
| App7 outlined Select SSR | 1171913 | 815224 | -29.8% | -25.6% | -34.2% | 5.9% | lower time in every pair, beyond control spread |
| App7 multiple Select SSR | 1202562 | 824898 | -29.2% | -28.7% | -30.1% | 0.6% | lower time in every pair, beyond control spread |
| App7 field Select SSR | 1816591 | 1323514 | -25.6% | -24.1% | -28.8% | 1.1% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/select.cjs:

```sh
OUTPUT=packages/vmui-material/bench/select/node-isolated.json node packages/vmui-material/bench/select.cjs
OUTPUT=packages/vmui-material/bench/select/bun-isolated.json bun packages/vmui-material/bench/select.cjs
node scripts/render-bench-report.cjs packages/vmui-material select select.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
