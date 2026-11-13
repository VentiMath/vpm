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

Recorded 2026-11-13T22:21:49.714Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 box SSR | 221701 | 244370 | 10.3% | 12.5% | 10.2% | 8.7% | higher time in every pair, beyond control spread |
| App7 box SSR | 275338 | 243833 | -12% | -12.2% | -11.4% | 4% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-13T22:21:59.700Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 box SSR | 129438 | 122368 | -4.2% | -1.8% | -7.1% | 1.2% | unestablished at this precision |
| App7 box SSR | 151902 | 118987 | -22% | -22.3% | -22% | 3.2% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/box.cjs:

```sh
OUTPUT=packages/vmui-material/bench/box/node-isolated.json node packages/vmui-material/bench/box.cjs
OUTPUT=packages/vmui-material/bench/box/bun-isolated.json bun packages/vmui-material/bench/box.cjs
node scripts/render-bench-report.cjs packages/vmui-material box box.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
