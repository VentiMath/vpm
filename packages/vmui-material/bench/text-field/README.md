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

Recorded 2026-11-15T03:19:26.993Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 standard SSR | 1049576 | 941396 | -9.7% | -9.7% | -10.2% | 3.1% | lower time in every pair, beyond control spread |
| Material9 outlined SSR | 1176570 | 1087854 | -7.5% | -3.6% | -12.3% | 3.4% | unestablished at this precision |
| Material9 multiline SSR | 1380830 | 1017291 | -23.9% | -25.7% | -23.3% | 5% | lower time in every pair, beyond control spread |
| Material9 form SSR | 1695521 | 1574421 | -8% | -7.2% | -8% | 4.7% | unestablished at this precision |
| App7 standard SSR | 1062132 | 930834 | -12.4% | -12.4% | 57% | 5.6% | unestablished at this precision |
| App7 outlined SSR | 1318483 | 1014096 | -22.2% | -25.1% | -18.8% | 3.6% | lower time in every pair, beyond control spread |
| App7 multiline SSR | 1435335 | 1005831 | -29.9% | -27.9% | -29.9% | 3.8% | lower time in every pair, beyond control spread |
| App7 form SSR | 1837395 | 1543215 | -16.5% | -17.5% | -14.7% | 8.5% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-15T03:20:05.378Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 standard SSR | 656511 | 584102 | -10.5% | -13.9% | -9.6% | 7.3% | lower time in every pair, beyond control spread |
| Material9 outlined SSR | 777400 | 709579 | -7.8% | -4% | -14.4% | 2.4% | lower time in every pair, beyond control spread |
| Material9 multiline SSR | 871906 | 693225 | -20.6% | -20% | -20.6% | 5.5% | lower time in every pair, beyond control spread |
| Material9 form SSR | 1180837 | 1086360 | -7.9% | -6.2% | -11% | 12.4% | unestablished at this precision |
| App7 standard SSR | 677009 | 599504 | -12% | -10.4% | -12.9% | 7.5% | lower time in every pair, beyond control spread |
| App7 outlined SSR | 826373 | 655619 | -20.6% | -19.5% | -21.2% | 3.5% | lower time in every pair, beyond control spread |
| App7 multiline SSR | 865282 | 672428 | -20.6% | -19.6% | -23% | 6.2% | lower time in every pair, beyond control spread |
| App7 form SSR | 1195204 | 1051640 | -12.8% | -12.8% | -12.8% | 5.2% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/text-field.cjs:

```sh
OUTPUT=packages/vmui-material/bench/text-field/node-isolated.json node packages/vmui-material/bench/text-field.cjs
OUTPUT=packages/vmui-material/bench/text-field/bun-isolated.json bun packages/vmui-material/bench/text-field.cjs
node scripts/render-bench-report.cjs packages/vmui-material text-field text-field.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
