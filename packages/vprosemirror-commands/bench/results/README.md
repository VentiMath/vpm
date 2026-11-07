# vprosemirror-commands measurements

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

Recorded 2026-11-07T06:57:17.981Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| split a paragraph | 1432 | 1166 | -19% | -42.3% | -16.3% | 1.6% | lower time in every pair, beyond control spread |
| join adjacent paragraphs | 890 | 753 | -15.6% | -17.3% | -15.6% | 1.4% | lower time in every pair, beyond control spread |
| toggle a stored cursor mark | 245 | 206 | -15.8% | -16.3% | -15.8% | 1.5% | lower time in every pair, beyond control spread |
| toggle a mark across a text range | 1009 | 1069 | 4.8% | 2.1% | 11.2% | 2.5% | unestablished at this precision |
| convert a paragraph to a heading | 1150 | 1003 | -13.1% | -14.9% | -11.3% | 3.2% | lower time in every pair, beyond control spread |
| wrap a paragraph in a quote | 1111 | 699 | -37.2% | -36.8% | -37.6% | 0.4% | lower time in every pair, beyond control spread |
| split after deleting across list items | 4005 | 2732 | -31.6% | -36% | -30.9% | 13.9% | lower time in every pair, beyond control spread |
| query the Enter command chain | 1448 | 704 | -51.4% | -51.7% | -51.4% | 2.4% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-07T06:57:50.034Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| split a paragraph | 823 | 1063 | 29.2% | 30.5% | 25.7% | 5.7% | higher time in every pair, beyond control spread |
| join adjacent paragraphs | 611 | 759 | 23.2% | 22.7% | 24.7% | 5% | higher time in every pair, beyond control spread |
| toggle a stored cursor mark | 228 | 146 | -37.8% | -38.9% | -34% | 5.3% | lower time in every pair, beyond control spread |
| toggle a mark across a text range | 736 | 942 | 27.9% | 27.9% | 30.9% | 44.2% | unestablished at this precision |
| convert a paragraph to a heading | 743 | 958 | 28.6% | 24.7% | 38.1% | 89.2% | unestablished at this precision |
| wrap a paragraph in a quote | 675 | 706 | 4.5% | 3.3% | 6% | 9.9% | unestablished at this precision |
| split after deleting across list items | 2493 | 2075 | -15.9% | -15.7% | -15.9% | 3.9% | lower time in every pair, beyond control spread |
| query the Enter command chain | 917 | 596 | -35.6% | -37.7% | -33% | 6.7% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vprosemirror-commands/bench/results/node-isolated.json node packages/vprosemirror-commands/bench/compare.cjs
OUTPUT=packages/vprosemirror-commands/bench/results/bun-isolated.json bun packages/vprosemirror-commands/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vprosemirror-commands results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
