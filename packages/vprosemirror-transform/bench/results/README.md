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

Recorded 2026-11-13T09:04:00.629Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| map a position through 32 edits | 145 | 137 | -5.7% | -3.8% | -6% | 3.4% | unestablished at this precision |
| recover a mirrored deletion | 53 | 23 | -52.2% | -51.6% | -52.3% | 8.7% | lower time in every pair, beyond control spread |
| insert text and map selection | 1031 | 673 | -29.9% | -34% | -29.9% | 1.1% | lower time in every pair, beyond control spread |
| apply and invert overlapping marks | 3220 | 2524 | -17.8% | -9% | -17.8% | 46.4% | unestablished at this precision |
| split and join a paragraph | 2412 | 2343 | -10.1% | -1.7% | -23.6% | 22.6% | unestablished at this precision |
| wrap and lift two paragraphs | 2362 | 2338 | 0.1% | 5.6% | -9.7% | 23.9% | unestablished at this precision |
| fit an open cross-block paste | 2156 | 1323 | -41.7% | -41.7% | -42% | 6.2% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-13T09:04:28.367Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| map a position through 32 edits | 231 | 242 | 5.3% | 5.1% | 7.7% | 1% | higher time in every pair, beyond control spread |
| recover a mirrored deletion | 37 | 32 | -12.6% | -13.9% | -10% | 3.7% | lower time in every pair, beyond control spread |
| insert text and map selection | 557 | 474 | -15.8% | -19.8% | -15.8% | 12.6% | unestablished at this precision |
| apply and invert overlapping marks | 1316 | 1260 | -3.8% | -22.8% | 1.2% | 2.6% | unestablished at this precision |
| split and join a paragraph | 1316 | 1365 | 3% | -9.3% | 4.3% | 3.8% | unestablished at this precision |
| wrap and lift two paragraphs | 1189 | 1601 | 33.4% | 27.6% | 33.4% | 3.6% | higher time in every pair, beyond control spread |
| fit an open cross-block paste | 1522 | 999 | -36.9% | -37.5% | -36.9% | 7.7% | lower time in every pair, beyond control spread |

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
