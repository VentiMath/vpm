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

Recorded 2026-11-17T20:00:59.730Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 scores Table SSR | 822707 | 874037 | 18.3% | 3.8% | 45.4% | 19.4% | unestablished at this precision |
| Material9 results Table SSR | 715377 | 720075 | 11.8% | 5.2% | 129.8% | 28.2% | unestablished at this precision |
| Material9 themed Table SSR | 1577335 | 1864964 | 19.3% | 17.1% | 25.3% | 30.4% | unestablished at this precision |
| App7 scores Table SSR | 703116 | 794507 | 13% | 13% | 158% | 28.7% | unestablished at this precision |
| App7 results Table SSR | 639665 | 724181 | 15.7% | 15.7% | 20.8% | 31.3% | unestablished at this precision |
| App7 themed Table SSR | 1575375 | 1845864 | 16.7% | 16.7% | 19.7% | 23.5% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-17T20:01:33.587Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 scores Table SSR | 962346 | 1370482 | 34% | 165.4% | 28.5% | 28.7% | unestablished at this precision |
| Material9 results Table SSR | 656988 | 909894 | 37.8% | 142.2% | 29.2% | 42.4% | unestablished at this precision |
| Material9 themed Table SSR | 1893081 | 2260630 | 7.1% | -13.9% | 62.1% | 26% | unestablished at this precision |
| App7 scores Table SSR | 1045161 | 933960 | 16% | 16% | -3.5% | 12.3% | unestablished at this precision |
| App7 results Table SSR | 658549 | 814869 | 32.3% | 34.2% | 29.6% | 4.9% | higher time in every pair, beyond control spread |
| App7 themed Table SSR | 2399352 | 2284302 | 6.2% | -5.9% | 6.2% | 23.3% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/tables-optimized.cjs:

```sh
OUTPUT=packages/vmui-material/bench/tables-optimized/node-isolated.json node packages/vmui-material/bench/tables-optimized.cjs
OUTPUT=packages/vmui-material/bench/tables-optimized/bun-isolated.json bun packages/vmui-material/bench/tables-optimized.cjs
node scripts/render-bench-report.cjs packages/vmui-material tables-optimized tables-optimized.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
