# vprosemirror-transform measurements

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

Recorded 2026-11-07T06:58:19.664Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| map a position through 32 edits | 136 | 136 | -0.9% | -1.5% | -0.2% | 1.2% | unestablished at this precision |
| recover a mirrored deletion | 45 | 23 | -50% | -48.8% | -50.8% | 3.2% | lower time in every pair, beyond control spread |
| insert text and map selection | 926 | 636 | -31.6% | -31.2% | -31.6% | 4.9% | lower time in every pair, beyond control spread |
| apply and invert overlapping marks | 2846 | 2344 | -17% | -8.9% | -23.8% | 22.3% | unestablished at this precision |
| split and join a paragraph | 2700 | 2400 | -11% | -11% | -15.1% | 19.9% | unestablished at this precision |
| wrap and lift two paragraphs | 2634 | 2336 | -11.3% | -7.3% | -15.3% | 17.9% | unestablished at this precision |
| fit an open cross-block paste | 2080 | 1179 | -43.3% | -43.3% | -41.1% | 3.1% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-07T06:58:47.800Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| map a position through 32 edits | 227 | 243 | 7.6% | 7.1% | 7.6% | 3.9% | higher time in every pair, beyond control spread |
| recover a mirrored deletion | 37 | 32 | -13.2% | -12.4% | -13.2% | 5.4% | lower time in every pair, beyond control spread |
| insert text and map selection | 529 | 463 | -12.7% | -13.4% | -12.4% | 6.4% | lower time in every pair, beyond control spread |
| apply and invert overlapping marks | 1308 | 1258 | -3.4% | -5.6% | -3.4% | 2.4% | lower time in every pair, beyond control spread |
| split and join a paragraph | 1323 | 1384 | 3.9% | 5.6% | 0.9% | 1.8% | unestablished at this precision |
| wrap and lift two paragraphs | 1169 | 1558 | 33.3% | 33.4% | 32.8% | 3.2% | higher time in every pair, beyond control spread |
| fit an open cross-block paste | 1523 | 1003 | -33.7% | -27.9% | -37.1% | 3.6% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vprosemirror-transform/bench/results/node-isolated.json node packages/vprosemirror-transform/bench/compare.cjs
OUTPUT=packages/vprosemirror-transform/bench/results/bun-isolated.json bun packages/vprosemirror-transform/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vprosemirror-transform results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
