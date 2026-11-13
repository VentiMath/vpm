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

Recorded 2026-11-13T08:00:50.431Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| map a position through 32 edits | 138 | 140 | 1.5% | 9.4% | 0.3% | 3.7% | unestablished at this precision |
| recover a mirrored deletion | 47 | 23 | -50.6% | -48.7% | -52.6% | 1.7% | lower time in every pair, beyond control spread |
| insert text and map selection | 956 | 710 | -25.8% | -23.5% | -28.1% | 0.8% | lower time in every pair, beyond control spread |
| apply and invert overlapping marks | 2874 | 2427 | -16.2% | -7% | -23.6% | 21.2% | unestablished at this precision |
| split and join a paragraph | 2783 | 2266 | -25.7% | -18.8% | -25.7% | 2.6% | lower time in every pair, beyond control spread |
| wrap and lift two paragraphs | 2620 | 2411 | -7.7% | 12.9% | -17.1% | 9.9% | unestablished at this precision |
| fit an open cross-block paste | 2143 | 1220 | -43.1% | -44.9% | -40.5% | 4% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-13T08:01:18.463Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| map a position through 32 edits | 228 | 245 | 7.4% | 7.4% | 7.8% | 0.5% | higher time in every pair, beyond control spread |
| recover a mirrored deletion | 37 | 33 | -8.9% | -11.3% | 88.5% | 1.8% | unestablished at this precision |
| insert text and map selection | 544 | 480 | -11.8% | -9.4% | -18.4% | 4.3% | lower time in every pair, beyond control spread |
| apply and invert overlapping marks | 1326 | 1297 | -2.4% | 4.4% | -2.4% | 3.9% | unestablished at this precision |
| split and join a paragraph | 1381 | 1474 | 3.7% | 18.1% | 0.3% | 0.7% | unestablished at this precision |
| wrap and lift two paragraphs | 1189 | 1594 | 32.3% | 32.9% | 32.3% | 1.9% | higher time in every pair, beyond control spread |
| fit an open cross-block paste | 1545 | 1018 | -34.9% | -34.9% | -32.7% | 2.6% | lower time in every pair, beyond control spread |

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
