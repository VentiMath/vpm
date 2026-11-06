# vorderedmap measurements

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

Recorded 2026-11-06T09:15:48.273Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| construct 16 entries | 70 | 162 | 130.6% | 130.6% | 130% | 6.4% | higher time in every pair, beyond control spread |
| update 16-entry map | 29 | 33 | 13.4% | 14.6% | 7.8% | 3.2% | unestablished at this precision |
| lookup 128-entry map | 186 | 47 | -74.4% | -74.4% | -74.8% | 1.1% | lower time in every pair, beyond control spread |
| append overlapping 128-entry maps | 18423 | 3539 | -81% | -81.5% | -80.2% | 0.4% | lower time in every pair, beyond control spread |
| subtract overlapping 128-entry maps | 18280 | 3339 | -82% | -81.9% | -82.1% | 1.6% | lower time in every pair, beyond control spread |
| ProseMirror 1.25.12 schema construction | 21314 | 21353 | 0.2% | -1.3% | 1.5% | 3.2% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-06T09:16:18.388Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| construct 16 entries | 94 | 78 | -16.8% | -16.8% | -17.7% | 1.5% | lower time in every pair, beyond control spread |
| update 16-entry map | 37 | 39 | 5.3% | 6.6% | 5.3% | 13.3% | unestablished at this precision |
| lookup 128-entry map | 189 | 39 | -79.3% | -79.4% | -79.3% | 9.7% | lower time in every pair, beyond control spread |
| append overlapping 128-entry maps | 30468 | 2998 | -90.1% | -89.9% | -90.2% | 6.3% | lower time in every pair, beyond control spread |
| subtract overlapping 128-entry maps | 30891 | 2996 | -90.2% | -83.9% | -90.2% | 3.6% | lower time in every pair, beyond control spread |
| ProseMirror 1.25.12 schema construction | 14470 | 14706 | 1.3% | 0.2% | 2.1% | 1.4% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vorderedmap/bench/results/node-isolated.json node packages/vorderedmap/bench/compare.cjs
OUTPUT=packages/vorderedmap/bench/results/bun-isolated.json bun packages/vorderedmap/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vorderedmap results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
