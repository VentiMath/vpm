# vmui-styled-engine measurements

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

Recorded 2026-11-13T05:26:38.106Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| serialize MUI style object | 829 | 957 | 14.3% | 13.4% | 16.9% | 2.1% | higher time in every pair, beyond control spread |
| styled component creation | 355 | 170 | -49.2% | -53.1% | -46.7% | 15.8% | lower time in every pair, beyond control spread |
| styled component server render | 2789 | 3451 | 25.8% | 26.1% | 15.5% | 2.1% | unestablished at this precision |
| theme global style server render | 2480 | 2713 | 9.4% | 9.4% | 10% | 20.8% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-13T05:26:55.915Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| serialize MUI style object | 376 | 382 | 1.6% | 3.9% | 0.5% | 3.1% | unestablished at this precision |
| styled component creation | 93 | 99 | 7% | 16.7% | 2% | 13% | unestablished at this precision |
| styled component server render | 2363 | 2568 | 9.3% | 6.5% | 9.8% | 6.1% | unestablished at this precision |
| theme global style server render | 1959 | 2148 | 12.9% | 12.9% | -11.8% | 8.4% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/run.cjs:

```sh
OUTPUT=packages/vmui-styled-engine/bench/results/node-isolated.json node packages/vmui-styled-engine/bench/run.cjs
OUTPUT=packages/vmui-styled-engine/bench/results/bun-isolated.json bun packages/vmui-styled-engine/bench/run.cjs
node scripts/render-bench-report.cjs packages/vmui-styled-engine results run.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
