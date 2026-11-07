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

Recorded 2026-11-07T06:07:53.951Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| map a position through 32 edits | 137 | 136 | -1.1% | -0.7% | -1.5% | 0.3% | unestablished at this precision |
| recover a mirrored deletion | 46 | 23 | -51% | -49.3% | -51.3% | 6.1% | lower time in every pair, beyond control spread |
| insert text and map selection | 925 | 643 | -30.7% | -31.5% | -30.2% | 0.6% | lower time in every pair, beyond control spread |
| apply and invert overlapping marks | 2919 | 2214 | -24.6% | -26.7% | -21.9% | 9.4% | lower time in every pair, beyond control spread |
| split and join a paragraph | 2878 | 2136 | -24.7% | -20.7% | -25.8% | 5.2% | lower time in every pair, beyond control spread |
| wrap and lift two paragraphs | 2113 | 2380 | -2.5% | 5.6% | -5.8% | 17.4% | unestablished at this precision |
| fit an open cross-block paste | 2063 | 1188 | -42.7% | -43.2% | -0.2% | 1.9% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-07T06:08:21.720Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| map a position through 32 edits | 226 | 241 | 7.2% | 7.3% | 5.8% | 0.2% | higher time in every pair, beyond control spread |
| recover a mirrored deletion | 37 | 32 | -14.2% | -12% | -14.5% | 2.3% | lower time in every pair, beyond control spread |
| insert text and map selection | 529 | 450 | -14.9% | -13.5% | -16% | 1.1% | lower time in every pair, beyond control spread |
| apply and invert overlapping marks | 1287 | 1242 | -3.7% | -3.1% | -5.9% | 1% | unestablished at this precision |
| split and join a paragraph | 1285 | 1334 | 4.3% | 3.8% | 5.1% | 2% | higher time in every pair, beyond control spread |
| wrap and lift two paragraphs | 1138 | 1555 | 36.2% | 35% | 39.6% | 5% | higher time in every pair, beyond control spread |
| fit an open cross-block paste | 1506 | 941 | -36.9% | -36.9% | -35.6% | 12.9% | lower time in every pair, beyond control spread |

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
