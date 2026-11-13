# vmui-utils measurements

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

Recorded 2026-11-13T07:33:43.267Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| merge theme defaults | 813 | 784 | -4.3% | -2.6% | -6% | 2.7% | unestablished at this precision |
| assign responsive style objects | 137 | 230 | 67.3% | 72.7% | 67.3% | 4.5% | higher time in every pair, beyond control spread |
| compose component classes | 144 | 133 | -8.5% | -7.2% | -8.5% | 2.9% | lower time in every pair, beyond control spread |
| controlled state and stable callback SSR | 1521 | 1321 | -12.9% | -13.6% | -12.9% | 0.4% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-13T07:34:01.196Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| merge theme defaults | 229 | 211 | -8.9% | -3% | -8.9% | 6.4% | unestablished at this precision |
| assign responsive style objects | 74 | 61 | -17.6% | -11.2% | -19.4% | 30% | unestablished at this precision |
| compose component classes | 70 | 61 | -12.2% | -12.6% | -12.2% | 3.4% | lower time in every pair, beyond control spread |
| controlled state and stable callback SSR | 1050 | 1067 | 2.5% | 2.8% | 0.3% | 7.1% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/run.cjs:

```sh
OUTPUT=packages/vmui-utils/bench/results/node-isolated.json node packages/vmui-utils/bench/run.cjs
OUTPUT=packages/vmui-utils/bench/results/bun-isolated.json bun packages/vmui-utils/bench/run.cjs
node scripts/render-bench-report.cjs packages/vmui-utils results run.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
