# vfloating-ui-dom measurements

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

Recorded 2026-11-01T22:05:28.606Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| model / dimensions | 53 | 69 | 32.7% | 74.4% | 32.7% | 101.2% | unestablished at this precision |
| model / scale | 115 | 204 | 81% | 57.8% | 144.3% | 366.8% | unestablished at this precision |
| model / clipping ancestry | 2048 | 2546 | 33.3% | 31.4% | 33.3% | 91.3% | unestablished at this precision |
| model / popover position | 8212 | 23516 | 188.6% | 188.6% | 316% | 338.9% | unestablished at this precision |
| model / subscribe + cleanup / listeners | 2583 | 2614 | 2.4% | 88.7% | -2% | 44.5% | unestablished at this precision |
| model / subscribe + cleanup / observers | 2455 | 3252 | 32.2% | 34.8% | 27.9% | 12.3% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T22:05:53.756Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| model / dimensions | 39 | 43 | 11.8% | -13.6% | 15.1% | 11.3% | unestablished at this precision |
| model / scale | 77 | 86 | 11.5% | 11.5% | 26.9% | 17.6% | unestablished at this precision |
| model / clipping ancestry | 1293 | 1309 | 0.6% | -2.4% | 14.1% | 4.2% | unestablished at this precision |
| model / popover position | 6318 | 7408 | 16.2% | 16.2% | 16.9% | 4.3% | higher time in every pair, beyond control spread |
| model / subscribe + cleanup / listeners | 1562 | 1383 | -10.9% | -18.3% | 15.2% | 15.6% | unestablished at this precision |
| model / subscribe + cleanup / observers | 2099 | 1972 | -2.1% | -10.4% | 32% | 13% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vfloating-ui-dom/bench/results/node-isolated.json node packages/vfloating-ui-dom/bench/compare.cjs
OUTPUT=packages/vfloating-ui-dom/bench/results/bun-isolated.json bun packages/vfloating-ui-dom/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vfloating-ui-dom
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
