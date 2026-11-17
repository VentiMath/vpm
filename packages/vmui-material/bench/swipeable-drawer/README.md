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

Recorded 2026-11-17T19:00:30.783Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 permanent SwipeableDrawer SSR | 41620 | 28773 | -30.8% | -30.7% | -31.8% | 9% | lower time in every pair, beyond control spread |
| Material9 persistent SwipeableDrawer SSR | 42672 | 28433 | -33.5% | -32.6% | -34.1% | 2.7% | lower time in every pair, beyond control spread |
| Material9 temporary SwipeableDrawer SSR | 74126 | 36260 | -50.9% | -51.3% | -50.7% | 1.8% | lower time in every pair, beyond control spread |
| App7 permanent SwipeableDrawer SSR | 40425 | 24483 | -39.7% | -38% | -39.7% | 2.1% | lower time in every pair, beyond control spread |
| App7 persistent SwipeableDrawer SSR | 41644 | 26146 | -36.4% | -37.4% | -35.9% | 0.3% | lower time in every pair, beyond control spread |
| App7 temporary SwipeableDrawer SSR | 72393 | 34404 | -52% | -53.4% | -51.4% | 1.2% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-17T19:01:03.090Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 permanent SwipeableDrawer SSR | 29513 | 19850 | -32.7% | -30.4% | -35.8% | 1% | lower time in every pair, beyond control spread |
| Material9 persistent SwipeableDrawer SSR | 31285 | 22267 | -28.9% | -23.1% | -33.9% | 4.3% | lower time in every pair, beyond control spread |
| Material9 temporary SwipeableDrawer SSR | 56119 | 31971 | -43.4% | -45.1% | -42.1% | 8.7% | lower time in every pair, beyond control spread |
| App7 permanent SwipeableDrawer SSR | 31199 | 21322 | -30.7% | -33.9% | -30.4% | 3.8% | lower time in every pair, beyond control spread |
| App7 persistent SwipeableDrawer SSR | 34626 | 25091 | -29.9% | -32.3% | -25.6% | 4.5% | lower time in every pair, beyond control spread |
| App7 temporary SwipeableDrawer SSR | 59031 | 31382 | -46.8% | -52.2% | -45.7% | 2.6% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/swipeable-drawer.cjs:

```sh
OUTPUT=packages/vmui-material/bench/swipeable-drawer/node-isolated.json node packages/vmui-material/bench/swipeable-drawer.cjs
OUTPUT=packages/vmui-material/bench/swipeable-drawer/bun-isolated.json bun packages/vmui-material/bench/swipeable-drawer.cjs
node scripts/render-bench-report.cjs packages/vmui-material swipeable-drawer swipeable-drawer.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
