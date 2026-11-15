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

Recorded 2026-11-15T02:04:45.291Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 single SSR | 458303 | 463842 | -1% | 7% | -17.5% | 12.8% | unestablished at this precision |
| Material9 multiline SSR | 547562 | 460806 | -20.9% | -20.9% | -16.6% | 5% | lower time in every pair, beyond control spread |
| Material9 form SSR | 873889 | 919265 | 7.7% | 10.8% | 4.2% | 14.6% | unestablished at this precision |
| App7 single SSR | 425507 | 442812 | 6% | 10.7% | -3.3% | 2.6% | unestablished at this precision |
| App7 multiline SSR | 519803 | 417266 | -19.5% | -32.1% | -19.1% | 11.2% | lower time in every pair, beyond control spread |
| App7 form SSR | 890210 | 988021 | 16.8% | 2% | 22.7% | 0.4% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-15T02:05:13.643Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 single SSR | 268390 | 250822 | -7.5% | -6% | -7.5% | 5.7% | unestablished at this precision |
| Material9 multiline SSR | 330191 | 256983 | -22.7% | -22.7% | -23.1% | 12% | lower time in every pair, beyond control spread |
| Material9 form SSR | 554587 | 595404 | 8% | 9.2% | 7% | 33.7% | unestablished at this precision |
| App7 single SSR | 273584 | 258919 | -3.8% | 4.4% | -11.7% | 19.8% | unestablished at this precision |
| App7 multiline SSR | 312627 | 265004 | -15.4% | -17% | -15.2% | 134% | unestablished at this precision |
| App7 form SSR | 533702 | 602100 | 12.8% | 9.4% | 19% | 20.8% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/input.cjs:

```sh
OUTPUT=packages/vmui-material/bench/input-optimized/node-isolated.json node packages/vmui-material/bench/input.cjs
OUTPUT=packages/vmui-material/bench/input-optimized/bun-isolated.json bun packages/vmui-material/bench/input.cjs
node scripts/render-bench-report.cjs packages/vmui-material input-optimized input.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
