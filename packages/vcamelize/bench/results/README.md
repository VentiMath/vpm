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

Recorded 2026-11-17T06:01:38.001Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| hyphenated CSS property | 194 | 75 | -61.2% | -61.5% | -61.2% | 2.6% | lower time in every pair, beyond control spread |
| already camel-cased property | 56 | 20 | -63.3% | -62.7% | -63.6% | 2.6% | lower time in every pair, beyond control spread |
| vendor CSS property | 288 | 114 | -60.4% | -60.3% | -60.4% | 0.9% | lower time in every pair, beyond control spread |
| nested object keys | 1419 | 1555 | 9% | 8.5% | 10.1% | 3.1% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-17T06:01:54.644Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| hyphenated CSS property | 105 | 41 | -61.6% | -61.3% | -61.6% | 2.3% | lower time in every pair, beyond control spread |
| already camel-cased property | 29 | 14 | -52.7% | -48.6% | -56.8% | 2.5% | lower time in every pair, beyond control spread |
| vendor CSS property | 163 | 61 | -62.7% | -62.7% | -62.7% | 1.3% | lower time in every pair, beyond control spread |
| nested object keys | 886 | 640 | -27.7% | -27.2% | -27.9% | 0.5% | lower time in every pair, beyond control spread |

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
