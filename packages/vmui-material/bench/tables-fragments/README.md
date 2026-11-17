# vmui-material measurements

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

Recorded 2026-11-17T20:25:04.986Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 scores Table SSR | 751414 | 801178 | 5.3% | 9.3% | 4.9% | 8.9% | unestablished at this precision |
| Material9 results Table SSR | 680261 | 694590 | 2.1% | 5.1% | 2.1% | 5% | unestablished at this precision |
| Material9 themed Table SSR | 1555923 | 1681598 | 8.1% | 8.1% | 11.4% | 6.3% | unestablished at this precision |
| App7 scores Table SSR | 679120 | 754900 | 10.5% | 11.1% | 9.9% | 6.7% | higher time in every pair, beyond control spread |
| App7 results Table SSR | 611701 | 687994 | 12.3% | 14.7% | 12.1% | 8.8% | higher time in every pair, beyond control spread |
| App7 themed Table SSR | 1473554 | 1741977 | 18.1% | 15.2% | 19.4% | 6.3% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-17T20:25:34.394Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 scores Table SSR | 648771 | 671463 | 1.7% | -0.2% | 5.1% | 3.1% | unestablished at this precision |
| Material9 results Table SSR | 554431 | 562956 | 2.2% | 2.5% | 2.2% | 5.5% | unestablished at this precision |
| Material9 themed Table SSR | 1473687 | 1541549 | 5% | 5% | 2.5% | 15.8% | unestablished at this precision |
| App7 scores Table SSR | 634394 | 646066 | 2.1% | 6.2% | -4% | 20.2% | unestablished at this precision |
| App7 results Table SSR | 532620 | 556367 | 5.3% | 4.5% | 6.7% | 2.7% | higher time in every pair, beyond control spread |
| App7 themed Table SSR | 1449659 | 1556841 | 6.3% | 10.9% | 6.3% | 6.2% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/tables-fragments.cjs:

```sh
OUTPUT=packages/vmui-material/bench/tables-fragments/node-isolated.json node packages/vmui-material/bench/tables-fragments.cjs
OUTPUT=packages/vmui-material/bench/tables-fragments/bun-isolated.json bun packages/vmui-material/bench/tables-fragments.cjs
node scripts/render-bench-report.cjs packages/vmui-material tables-fragments tables-fragments.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
