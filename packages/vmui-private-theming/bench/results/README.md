# vmui-private-theming measurements

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

Recorded 2026-11-12T23:19:16.841Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| single theme provider SSR | 2123 | 1620 | -23.4% | -22.9% | -23.4% | 2.1% | lower time in every pair, beyond control spread |
| three nested providers and theme consumer | 3261 | 2237 | -30.9% | -31.3% | -30.4% | 1.5% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-12T23:19:26.305Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| single theme provider SSR | 1207 | 1306 | 9.4% | 21% | 4.9% | 2.8% | unestablished at this precision |
| three nested providers and theme consumer | 1699 | 1730 | 1.7% | 4.6% | 1.6% | 2.2% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/run.cjs:

```sh
OUTPUT=packages/vmui-private-theming/bench/results/node-isolated.json node packages/vmui-private-theming/bench/run.cjs
OUTPUT=packages/vmui-private-theming/bench/results/bun-isolated.json bun packages/vmui-private-theming/bench/run.cjs
node scripts/render-bench-report.cjs packages/vmui-private-theming results run.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
