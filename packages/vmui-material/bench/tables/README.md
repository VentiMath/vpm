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

Recorded 2026-11-17T19:25:45.182Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 scores Table SSR | 1337545 | 3073655 | 140% | 79.9% | 179.5% | 18.1% | higher time in every pair, beyond control spread |
| Material9 results Table SSR | 1125539 | 2253125 | 95.7% | 56.7% | 162.1% | 49.2% | unestablished at this precision |
| Material9 themed Table SSR | 3478271 | 3593880 | 10.9% | 16.4% | 0.6% | 50.1% | unestablished at this precision |
| App7 scores Table SSR | 1386286 | 2241984 | 67.2% | 52.4% | 81.3% | 53.3% | unestablished at this precision |
| App7 results Table SSR | 1225081 | 1692864 | 34.7% | 34.8% | 34.7% | 38% | unestablished at this precision |
| App7 themed Table SSR | 3620470 | 3064174 | -17.7% | -17.7% | 4.7% | 19.2% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-17T19:26:24.214Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 scores Table SSR | 1352224 | 2578873 | 89.5% | 75.9% | 212.2% | 8.4% | unestablished at this precision |
| Material9 results Table SSR | 1483116 | 1628676 | 11.4% | 11.4% | 14.9% | 3.2% | unestablished at this precision |
| Material9 themed Table SSR | 4158062 | 4434906 | 7.6% | 7.6% | -3.5% | 12.8% | unestablished at this precision |
| App7 scores Table SSR | 1215668 | 3356985 | 131.1% | 204.2% | 76.4% | 4.2% | higher time in every pair, beyond control spread |
| App7 results Table SSR | 944609 | 2937160 | 147.7% | 147.7% | 218.2% | 18.5% | higher time in every pair, beyond control spread |
| App7 themed Table SSR | 3077849 | 3768201 | 32% | 56.9% | 32% | 12.3% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/tables.cjs:

```sh
OUTPUT=packages/vmui-material/bench/tables/node-isolated.json node packages/vmui-material/bench/tables.cjs
OUTPUT=packages/vmui-material/bench/tables/bun-isolated.json bun packages/vmui-material/bench/tables.cjs
node scripts/render-bench-report.cjs packages/vmui-material tables tables.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
