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

Recorded 2026-11-18T00:04:36.714Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 sort navigation SSR | 228348 | 234335 | 3.3% | 5.6% | 1.3% | 17.9% | unestablished at this precision |
| Material9 text navigation SSR | 2531474 | 2943565 | 14.3% | 6.2% | 19.1% | 5.6% | unestablished at this precision |
| Material9 outlined navigation SSR | 2548941 | 3382312 | 31.5% | 35.3% | 29% | 70.7% | unestablished at this precision |
| App7 sort navigation SSR | 209228 | 242252 | 14.1% | 11.9% | 21.5% | 53% | unestablished at this precision |
| App7 text navigation SSR | 2474346 | 3077818 | 27% | 23.1% | 27.5% | 18.7% | unestablished at this precision |
| App7 outlined navigation SSR | 2430841 | 3488596 | 38.7% | 37.5% | 43.8% | 4.7% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-18T00:05:07.830Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 sort navigation SSR | 147167 | 159883 | 11.3% | 7.2% | 18.9% | 3.6% | unestablished at this precision |
| Material9 text navigation SSR | 1530922 | 1867365 | 23.3% | 22.2% | 30.2% | 8.5% | higher time in every pair, beyond control spread |
| Material9 outlined navigation SSR | 1511667 | 2267316 | 51.2% | 44.3% | 57.7% | 3.6% | higher time in every pair, beyond control spread |
| App7 sort navigation SSR | 142187 | 163928 | 15.3% | 12.1% | 21.2% | 3.7% | higher time in every pair, beyond control spread |
| App7 text navigation SSR | 1468444 | 1894869 | 26.7% | 30.9% | 22.1% | 5.2% | higher time in every pair, beyond control spread |
| App7 outlined navigation SSR | 1454961 | 2283745 | 54.3% | 53.1% | 62.7% | 3% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/navigation.cjs:

```sh
OUTPUT=packages/vmui-material/bench/navigation/node-isolated.json node packages/vmui-material/bench/navigation.cjs
OUTPUT=packages/vmui-material/bench/navigation/bun-isolated.json bun packages/vmui-material/bench/navigation.cjs
node scripts/render-bench-report.cjs packages/vmui-material navigation navigation.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
