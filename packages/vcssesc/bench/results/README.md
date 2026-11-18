# vcssesc measurements

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

Recorded 2026-11-18T21:28:20.736Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| ASCII CSS text | 534 | 106 | -80% | -79.9% | -80.2% | 19.8% | lower time in every pair, beyond control spread |
| ASCII class name | 633 | 101 | -84% | -84.2% | -83.7% | 6.5% | lower time in every pair, beyond control spread |
| utility selector | 889 | 329 | -63% | -63.3% | -62.9% | 8.1% | lower time in every pair, beyond control spread |
| Unicode identifier | 1188 | 476 | -60.1% | -59.7% | -60.1% | 12.8% | lower time in every pair, beyond control spread |
| quoted CSS string | 1000 | 428 | -57.5% | -57% | -57.5% | 18.4% | lower time in every pair, beyond control spread |
| escaped ASCII | 1759 | 586 | -66.7% | -66.9% | -66.6% | 1.9% | lower time in every pair, beyond control spread |
| dense Unicode | 65765 | 24402 | -62.8% | -64.5% | -61.4% | 0.7% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-18T21:28:56.202Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| ASCII CSS text | 426 | 38 | -91% | -91.3% | -90.7% | 1.5% | lower time in every pair, beyond control spread |
| ASCII class name | 383 | 29 | -92.5% | -92.7% | -92.1% | 2.3% | lower time in every pair, beyond control spread |
| utility selector | 562 | 233 | -58.4% | -59.1% | -58% | 2.4% | lower time in every pair, beyond control spread |
| Unicode identifier | 789 | 359 | -54.7% | -55.2% | -53% | 1.3% | lower time in every pair, beyond control spread |
| quoted CSS string | 831 | 353 | -57.1% | -58.1% | -56.2% | 2.9% | lower time in every pair, beyond control spread |
| escaped ASCII | 1244 | 607 | -51.8% | -51.7% | -55.8% | 2.7% | lower time in every pair, beyond control spread |
| dense Unicode | 52632 | 40812 | -22.5% | -23.5% | -20.1% | 3.5% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vcssesc/bench/results/node-isolated.json node packages/vcssesc/bench/compare.cjs
OUTPUT=packages/vcssesc/bench/results/bun-isolated.json bun packages/vcssesc/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vcssesc results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
