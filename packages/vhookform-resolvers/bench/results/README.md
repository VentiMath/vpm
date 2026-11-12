# vhookform-resolvers measurements

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

Recorded 2026-11-12T20:31:58.181Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Zod 3 valid twenty-field form | 4231 | 4152 | -4.2% | -8.2% | -1.6% | 1.2% | unestablished at this precision |
| Zod 3 invalid nested form, all errors | 9904 | 9837 | -0.8% | -3.9% | 2.5% | 4.7% | unestablished at this precision |
| Zod 4 valid twenty-field form | 1501 | 1434 | -4.6% | -2.9% | -5.2% | 1.2% | unestablished at this precision |
| Zod 4 invalid nested form, all errors | 12417 | 5209 | -57.9% | -59.6% | -53% | 1.8% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-12T20:32:44.575Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Zod 3 valid twenty-field form | 2254 | 2176 | -1.6% | -4.6% | -1.6% | 2.5% | unestablished at this precision |
| Zod 3 invalid nested form, all errors | 4692 | 4057 | -15.5% | -16.4% | -14.8% | 2.1% | lower time in every pair, beyond control spread |
| Zod 4 valid twenty-field form | 1393 | 1441 | 4.4% | 10.8% | 2.2% | 3.1% | unestablished at this precision |
| Zod 4 invalid nested form, all errors | 4737 | 2966 | -36.9% | -42.1% | -35.2% | 5.2% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/run.cjs:

```sh
OUTPUT=packages/vhookform-resolvers/bench/results/node-isolated.json node packages/vhookform-resolvers/bench/run.cjs
OUTPUT=packages/vhookform-resolvers/bench/results/bun-isolated.json bun packages/vhookform-resolvers/bench/run.cjs
node scripts/render-bench-report.cjs packages/vhookform-resolvers results run.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
