# vpngjs measurements

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

Recorded 2026-11-03T19:30:36.409Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| small RGBA | 45172 | 35160 | -23.5% | -17.8% | -23.5% | 2.8% | lower time in every pair, beyond control spread |
| interlaced 16-bit RGB | 137905 | 100377 | -26% | -26% | -29.7% | 3.4% | lower time in every pair, beyond control spread |
| indexed transparency | 50695 | 33299 | -32.7% | -32.7% | -18.2% | 10.1% | unestablished at this precision |
| resvg 960×480 | 10302698 | 8342672 | -17.7% | -13.8% | -18.2% | 5.1% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-03T19:30:58.190Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| small RGBA | 38150 | 34150 | -9.5% | -10.2% | -9.3% | 3.1% | lower time in every pair, beyond control spread |
| interlaced 16-bit RGB | 137301 | 79009 | -42.4% | -42.1% | -42.6% | 2% | lower time in every pair, beyond control spread |
| indexed transparency | 34332 | 34455 | -1.2% | -2.3% | 3.9% | 1.4% | unestablished at this precision |
| resvg 960×480 | 6380787 | 5130365 | -19.5% | -19.5% | -21.2% | 3.1% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vpngjs/bench/results/node-isolated.json node packages/vpngjs/bench/compare.cjs
OUTPUT=packages/vpngjs/bench/results/bun-isolated.json bun packages/vpngjs/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vpngjs results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
