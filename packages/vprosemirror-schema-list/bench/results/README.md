# vprosemirror-schema-list measurements

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

Recorded 2026-11-07T09:29:53.306Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| wrap 12 paragraphs | 29971 | 34543 | 13.7% | 9.6% | 19.7% | 32.6% | unestablished at this precision |
| split a list item (type array) | 2419 | 2412 | -0.5% | -0.5% | -0.6% | 2.9% | unestablished at this precision |
| sink six items under a predecessor | 2137 | 2468 | 16.4% | 12.9% | 18.6% | 4.1% | higher time in every pair, beyond control spread |
| lift 12 items out of a list | 32457 | 23346 | -25.1% | -33.4% | -13.3% | 2.6% | lower time in every pair, beyond control spread |
| lift a nested item with a following sibling | 7482 | 7678 | -0.8% | 0.1% | -0.8% | 11.2% | unestablished at this precision |
| split an empty nested item | 5001 | 8150 | 61.6% | 50.2% | 78.5% | 2.5% | higher time in every pair, beyond control spread |
| query whether an item can sink | 81 | 321 | 298.8% | 298.8% | 282.5% | 2.7% | higher time in every pair, beyond control spread |
| full VPM stack: wrap 12 paragraphs | 35618 | 27941 | -21.2% | -24.5% | -14.7% | 2.4% | lower time in every pair, beyond control spread |
| full VPM stack: lift 12 items | 29226 | 28099 | -1.1% | 0.7% | -9.8% | 4.6% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-07T09:30:28.896Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| wrap 12 paragraphs | 15084 | 16316 | 6.6% | 8.2% | 4.9% | 9.5% | unestablished at this precision |
| split a list item (type array) | 1364 | 1298 | -3% | 1.2% | -18.5% | 1.5% | unestablished at this precision |
| sink six items under a predecessor | 1159 | 1298 | 12% | 12% | 10.1% | 12.2% | unestablished at this precision |
| lift 12 items out of a list | 16391 | 12386 | -25.7% | -28.4% | -17.6% | 9.7% | lower time in every pair, beyond control spread |
| lift a nested item with a following sibling | 3308 | 3859 | 13.9% | 10.2% | 13.9% | 3.8% | unestablished at this precision |
| split an empty nested item | 2588 | 4126 | 52.9% | 52.9% | 108.7% | 2.9% | higher time in every pair, beyond control spread |
| query whether an item can sink | 49 | 192 | 285.1% | 296.8% | 277.9% | 5% | higher time in every pair, beyond control spread |
| full VPM stack: wrap 12 paragraphs | 14955 | 23447 | 56.8% | 55.3% | 57.9% | 3.4% | higher time in every pair, beyond control spread |
| full VPM stack: lift 12 items | 15902 | 19412 | 25.8% | 30.7% | 19.7% | 7.7% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vprosemirror-schema-list/bench/results/node-isolated.json node packages/vprosemirror-schema-list/bench/compare.cjs
OUTPUT=packages/vprosemirror-schema-list/bench/results/bun-isolated.json bun packages/vprosemirror-schema-list/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vprosemirror-schema-list results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
