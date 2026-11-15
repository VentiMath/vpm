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

Recorded 2026-11-15T02:23:44.654Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 standard SSR | 567390 | 658786 | 16.5% | 16.9% | 15% | 4.2% | higher time in every pair, beyond control spread |
| Material9 outlined SSR | 707127 | 822519 | 16.3% | 8.5% | 21.2% | 2.8% | unestablished at this precision |
| Material9 multiline SSR | 829486 | 756985 | -7.7% | -30.3% | -7.7% | 1% | lower time in every pair, beyond control spread |
| Material9 form SSR | 1092382 | 1173321 | 7% | 4.1% | 7.9% | 9.6% | unestablished at this precision |
| App7 standard SSR | 511608 | 589751 | 16.5% | 13.5% | 19.6% | 24.4% | unestablished at this precision |
| App7 outlined SSR | 686282 | 710378 | 4.7% | 4.7% | 3.6% | 4.2% | unestablished at this precision |
| App7 multiline SSR | 808131 | 731457 | -8.7% | -6.7% | -13.7% | 5.4% | lower time in every pair, beyond control spread |
| App7 form SSR | 955106 | 1173717 | 23.5% | 23.8% | 20% | 2.6% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-15T02:24:21.474Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 standard SSR | 345012 | 363134 | 6.2% | 8.7% | 2.9% | 4.2% | unestablished at this precision |
| Material9 outlined SSR | 479973 | 478662 | 1.1% | 2.6% | -3.5% | 0.6% | unestablished at this precision |
| Material9 multiline SSR | 535105 | 461245 | -14.6% | -12.9% | -14.9% | 5.6% | lower time in every pair, beyond control spread |
| Material9 form SSR | 766773 | 794954 | 5.5% | 3.7% | 6.2% | 2.9% | unestablished at this precision |
| App7 standard SSR | 347844 | 378035 | 11.1% | 11.1% | 2% | 5.6% | unestablished at this precision |
| App7 outlined SSR | 458724 | 464234 | 0.8% | 0.8% | 0.3% | 3.4% | unestablished at this precision |
| App7 multiline SSR | 529613 | 461156 | -12.9% | -12.9% | -12.7% | 5% | lower time in every pair, beyond control spread |
| App7 form SSR | 771386 | 791484 | 3.9% | 8.1% | -0.1% | 4.2% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/input-variants.cjs:

```sh
OUTPUT=packages/vmui-material/bench/input-variants/node-isolated.json node packages/vmui-material/bench/input-variants.cjs
OUTPUT=packages/vmui-material/bench/input-variants/bun-isolated.json bun packages/vmui-material/bench/input-variants.cjs
node scripts/render-bench-report.cjs packages/vmui-material input-variants input-variants.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
