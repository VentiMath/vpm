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

Recorded 2026-11-15T02:49:44.388Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 standard SSR | 747056 | 709369 | -4.7% | -5.3% | -2.6% | 0.8% | unestablished at this precision |
| Material9 outlined SSR | 884027 | 843275 | -5.1% | -2% | -7.4% | 1.4% | unestablished at this precision |
| Material9 multiline SSR | 1027916 | 822162 | -20.5% | -18.5% | -21.8% | 11.2% | lower time in every pair, beyond control spread |
| Material9 form SSR | 1433607 | 1380713 | -2.7% | -0.3% | -7.2% | 6.3% | unestablished at this precision |
| App7 standard SSR | 808086 | 650511 | -19.9% | -20.2% | -18.6% | 3.6% | lower time in every pair, beyond control spread |
| App7 outlined SSR | 1028618 | 816927 | -21.2% | -20.3% | -21.6% | 2.1% | lower time in every pair, beyond control spread |
| App7 multiline SSR | 1116320 | 817089 | -27.5% | -31.8% | -27.5% | 1.7% | lower time in every pair, beyond control spread |
| App7 form SSR | 1605522 | 1413998 | -11.3% | -7.1% | -12.7% | 1% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-15T02:50:21.888Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 standard SSR | 466398 | 451809 | -3.1% | -3% | -3.2% | 3.4% | unestablished at this precision |
| Material9 outlined SSR | 591747 | 557842 | -5.5% | -1.9% | -9.5% | 4.9% | unestablished at this precision |
| Material9 multiline SSR | 671270 | 551084 | -18.5% | -18.8% | -18.5% | 6.7% | lower time in every pair, beyond control spread |
| Material9 form SSR | 1078152 | 998385 | -7.1% | -3.4% | -8.7% | 6.9% | unestablished at this precision |
| App7 standard SSR | 483938 | 450872 | -6.4% | -6.4% | -12.8% | 4.5% | unestablished at this precision |
| App7 outlined SSR | 630643 | 543176 | -13.9% | -11.4% | -19.6% | 3.2% | lower time in every pair, beyond control spread |
| App7 multiline SSR | 675612 | 537739 | -20.5% | -19.2% | -22.5% | 4.9% | lower time in every pair, beyond control spread |
| App7 form SSR | 1016818 | 965394 | -5.9% | -6.9% | -2.4% | 4.6% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/input-decorations.cjs:

```sh
OUTPUT=packages/vmui-material/bench/input-decorations/node-isolated.json node packages/vmui-material/bench/input-decorations.cjs
OUTPUT=packages/vmui-material/bench/input-decorations/bun-isolated.json bun packages/vmui-material/bench/input-decorations.cjs
node scripts/render-bench-report.cjs packages/vmui-material input-decorations input-decorations.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
