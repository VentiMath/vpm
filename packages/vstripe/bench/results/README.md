# vstripe measurements

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

Recorded 2026-11-03T21:18:30.704Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| construct scoped client | 36156 | 383 | -98.9% | -99% | -98.8% | 5.7% | lower time in every pair, beyond control spread |
| verify Checkout string event | 3790 | 3710 | -2.1% | -7.2% | 0% | 1.4% | unestablished at this precision |
| verify 32 KiB string event | 32463 | 31446 | -4.2% | -4.2% | -3.1% | 1% | unestablished at this precision |
| verify Checkout bytes event | 4006 | 3803 | -5.3% | -5.2% | -5.3% | 1.3% | lower time in every pair, beyond control spread |
| verify 32 KiB bytes event | 36104 | 32114 | -11.1% | -11.1% | -7.8% | 1% | lower time in every pair, beyond control spread |
| Checkout request pipeline / synthetic Fetch | 37070 | 10743 | -70.5% | -70.2% | -76.4% | 2.4% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-03T21:20:27.949Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| construct scoped client | 27141 | 177 | -99.4% | -99.4% | -99.3% | 8.7% | lower time in every pair, beyond control spread |
| verify Checkout string event | 2278 | 2121 | -6.4% | -3.2% | -8.9% | 3.1% | unestablished at this precision |
| verify 32 KiB string event | 26662 | 24366 | -8.2% | -5.3% | -11.1% | 19.3% | unestablished at this precision |
| verify Checkout bytes event | 2609 | 2168 | -15.5% | -14.4% | -18% | 15.8% | unestablished at this precision |
| verify 32 KiB bytes event | 32790 | 23109 | -28.7% | -28.7% | -30.4% | 14.5% | lower time in every pair, beyond control spread |
| Checkout request pipeline / synthetic Fetch | 25138 | 29226 | 14.5% | 14.5% | 18.5% | 24% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vstripe/bench/results/node-isolated.json node packages/vstripe/bench/compare.cjs
OUTPUT=packages/vstripe/bench/results/bun-isolated.json bun packages/vstripe/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vstripe results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
