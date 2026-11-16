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

Recorded 2026-11-16T23:18:26.876Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 archive Skeleton SSR | 185461 | 154842 | -16.5% | -16.5% | -16.2% | 2.6% | lower time in every pair, beyond control spread |
| Material9 signup Skeleton SSR | 228519 | 172301 | -25.5% | -24.3% | -26% | 11.3% | lower time in every pair, beyond control spread |
| Material9 fuse Skeleton SSR | 198104 | 149149 | -24.7% | -28.8% | -24.1% | 19.2% | lower time in every pair, beyond control spread |
| App7 archive Skeleton SSR | 178818 | 143345 | -20.2% | -20.2% | -17.9% | 39.6% | unestablished at this precision |
| App7 signup Skeleton SSR | 204350 | 172477 | -16.5% | -13.1% | -18.2% | 6.6% | lower time in every pair, beyond control spread |
| App7 fuse Skeleton SSR | 181520 | 142840 | -21.3% | -20.6% | -22.5% | 6% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-16T23:18:52.730Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 archive Skeleton SSR | 112431 | 79757 | -28.6% | -31.6% | -26.8% | 8.6% | lower time in every pair, beyond control spread |
| Material9 signup Skeleton SSR | 127644 | 97169 | -25.7% | -27.8% | -21.9% | 10% | lower time in every pair, beyond control spread |
| Material9 fuse Skeleton SSR | 115918 | 88037 | -23.3% | -25.1% | -23.3% | 7% | lower time in every pair, beyond control spread |
| App7 archive Skeleton SSR | 110691 | 81191 | -26.1% | -25.8% | -26.9% | 13.3% | lower time in every pair, beyond control spread |
| App7 signup Skeleton SSR | 136262 | 96488 | -29.1% | -21.6% | -34% | 5.6% | lower time in every pair, beyond control spread |
| App7 fuse Skeleton SSR | 115933 | 80968 | -29.4% | -33.4% | -26.8% | 6.6% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/skeleton.cjs:

```sh
OUTPUT=packages/vmui-material/bench/skeleton/node-isolated.json node packages/vmui-material/bench/skeleton.cjs
OUTPUT=packages/vmui-material/bench/skeleton/bun-isolated.json bun packages/vmui-material/bench/skeleton.cjs
node scripts/render-bench-report.cjs packages/vmui-material skeleton skeleton.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
