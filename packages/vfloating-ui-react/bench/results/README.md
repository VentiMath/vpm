# vfloating-ui-react measurements

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

Recorded 2026-11-01T23:35:43.213Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR interactions / popover | 17786 | 7131 | -58.2% | -58.9% | -55.4% | 4.7% | lower time in every pair, beyond control spread |
| SSR interactions / tooltip | 14006 | 8644 | -40.1% | -40.1% | -40.1% | 7% | lower time in every pair, beyond control spread |
| SSR interactions / menu | 15124 | 7680 | -47.4% | -54.2% | -40.3% | 12.9% | lower time in every pair, beyond control spread |
| mounted interaction props / composed click | 572 | 465 | -17.7% | -20.9% | -15.4% | 6.8% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T23:36:02.918Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR interactions / popover | 15308 | 7086 | -52.2% | -52.6% | -51.8% | 10.3% | lower time in every pair, beyond control spread |
| SSR interactions / tooltip | 13015 | 7891 | -38.2% | -34.8% | -44.3% | 10% | lower time in every pair, beyond control spread |
| SSR interactions / menu | 15481 | 7802 | -48.7% | -48.8% | -47.8% | 6.3% | lower time in every pair, beyond control spread |
| mounted interaction props / composed click | 450 | 262 | -42.1% | -42.7% | -41.6% | 1.5% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vfloating-ui-react/bench/results/node-isolated.json node packages/vfloating-ui-react/bench/compare.cjs
OUTPUT=packages/vfloating-ui-react/bench/results/bun-isolated.json bun packages/vfloating-ui-react/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vfloating-ui-react results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
