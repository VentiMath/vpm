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

Recorded 2026-11-17T05:51:22.969Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 navigation Tooltip SSR | 189855 | 21701 | -89.1% | -89.2% | -88% | 2.3% | lower time in every pair, beyond control spread |
| Material9 copy Tooltip SSR | 36070 | 5737 | -84.1% | -84.4% | -83.6% | 5% | lower time in every pair, beyond control spread |
| App7 navigation Tooltip SSR | 194592 | 21313 | -89.2% | -89.6% | -88.7% | 2.7% | lower time in every pair, beyond control spread |
| App7 copy Tooltip SSR | 40282 | 5538 | -86.2% | -86.6% | -85.5% | 5.8% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-17T05:51:45.554Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 navigation Tooltip SSR | 102969 | 17438 | -82.9% | -83.4% | -82.9% | 1.5% | lower time in every pair, beyond control spread |
| Material9 copy Tooltip SSR | 21293 | 4315 | -79.5% | -79.2% | -80.3% | 11.4% | lower time in every pair, beyond control spread |
| App7 navigation Tooltip SSR | 106223 | 16750 | -84.6% | -84.6% | -84.2% | 3.1% | lower time in every pair, beyond control spread |
| App7 copy Tooltip SSR | 23937 | 4334 | -82% | -82.8% | -81.2% | 4.6% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/tooltip.cjs:

```sh
OUTPUT=packages/vmui-material/bench/tooltip/node-isolated.json node packages/vmui-material/bench/tooltip.cjs
OUTPUT=packages/vmui-material/bench/tooltip/bun-isolated.json bun packages/vmui-material/bench/tooltip.cjs
node scripts/render-bench-report.cjs packages/vmui-material tooltip tooltip.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
