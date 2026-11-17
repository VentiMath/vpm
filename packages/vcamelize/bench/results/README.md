# vcamelize measurements

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

Recorded 2026-11-17T04:07:51.504Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| hyphenated CSS property | 192 | 73 | -61.2% | -60.5% | -61.8% | 1.7% | lower time in every pair, beyond control spread |
| already camel-cased property | 54 | 20 | -62.8% | -61.9% | -63.4% | 1.9% | lower time in every pair, beyond control spread |
| vendor CSS property | 284 | 111 | -60.7% | -59.5% | -60.8% | 9.6% | lower time in every pair, beyond control spread |
| nested object keys | 1378 | 1515 | 9.2% | 7.2% | 20.4% | 6.6% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-17T04:08:07.942Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| hyphenated CSS property | 104 | 40 | -61.8% | -61.8% | -61.8% | 3% | lower time in every pair, beyond control spread |
| already camel-cased property | 29 | 15 | -48.7% | -48.7% | -48.7% | 1.4% | lower time in every pair, beyond control spread |
| vendor CSS property | 160 | 58 | -63.8% | -63.8% | -63.9% | 0.3% | lower time in every pair, beyond control spread |
| nested object keys | 875 | 610 | -30.3% | -30.5% | -30.3% | 3.4% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vcamelize/bench/results/node-isolated.json node packages/vcamelize/bench/compare.cjs
OUTPUT=packages/vcamelize/bench/results/bun-isolated.json bun packages/vcamelize/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vcamelize results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
