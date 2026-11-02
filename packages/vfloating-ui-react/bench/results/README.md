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

Recorded 2026-11-02T16:57:18.795Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR interactions / popover | 18172 | 8699 | -51.5% | -55.6% | -46.4% | 17.5% | lower time in every pair, beyond control spread |
| SSR interactions / tooltip | 15668 | 7531 | -53.2% | -54% | -47.3% | 13.4% | lower time in every pair, beyond control spread |
| SSR interactions / menu | 18901 | 11224 | -38.5% | -43.3% | -28.6% | 34.7% | unestablished at this precision |
| mounted interaction props / composed click | 643 | 553 | -15.8% | -19% | -9.2% | 15% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-02T16:57:39.310Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR interactions / popover | 20184 | 9964 | -48.5% | -50.6% | -43.9% | 18.1% | lower time in every pair, beyond control spread |
| SSR interactions / tooltip | 17262 | 9558 | -44.6% | -44.6% | -42.8% | 2.9% | lower time in every pair, beyond control spread |
| SSR interactions / menu | 17974 | 9965 | -42.5% | -41.5% | -45.6% | 36.9% | lower time in every pair, beyond control spread |
| mounted interaction props / composed click | 545 | 306 | -44.9% | -42.6% | -45.6% | 10.3% | lower time in every pair, beyond control spread |

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
