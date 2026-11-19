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

Recorded 2026-11-19T01:08:24.956Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 links list-button SSR | 228862 | 292868 | 28.3% | 29.1% | 28.3% | 15.2% | higher time in every pair, beyond control spread |
| Material9 dense list-button SSR | 233312 | 270478 | 17.6% | 17.6% | 16.9% | 70.5% | unestablished at this precision |
| Material9 icons list-button SSR | 234014 | 283463 | 20.7% | 20.8% | 20.4% | 8.9% | higher time in every pair, beyond control spread |
| App7 links list-button SSR | 236516 | 286884 | 22.3% | 25% | 22.3% | 18.2% | higher time in every pair, beyond control spread |
| App7 dense list-button SSR | 265165 | 267617 | 0.5% | -2% | 4.9% | 3.6% | unestablished at this precision |
| App7 icons list-button SSR | 265562 | 275796 | 3.1% | 3.1% | 3.1% | 5.7% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-19T01:08:51.211Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 links list-button SSR | 157493 | 165197 | 4% | 0.4% | 8.2% | 19.5% | unestablished at this precision |
| Material9 dense list-button SSR | 159846 | 153729 | -2.6% | -0.4% | -5% | 28% | unestablished at this precision |
| Material9 icons list-button SSR | 173077 | 172948 | -0.1% | -0.1% | -6.6% | 0.9% | unestablished at this precision |
| App7 links list-button SSR | 170134 | 166121 | -3.5% | -2.6% | -3.5% | 10.1% | unestablished at this precision |
| App7 dense list-button SSR | 168491 | 161481 | -2.4% | -7.1% | -2.4% | 4% | unestablished at this precision |
| App7 icons list-button SSR | 179058 | 178315 | -0.5% | -0.5% | -1.3% | 3.6% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/list-button.cjs:

```sh
OUTPUT=packages/vmui-material/bench/list-button/node-isolated.json node packages/vmui-material/bench/list-button.cjs
OUTPUT=packages/vmui-material/bench/list-button/bun-isolated.json bun packages/vmui-material/bench/list-button.cjs
node scripts/render-bench-report.cjs packages/vmui-material list-button list-button.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
