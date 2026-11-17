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

Recorded 2026-11-17T08:11:38.442Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 closed Dialog SSR | 23801 | 6706 | -71.7% | -72.6% | -70.9% | 3.1% | lower time in every pair, beyond control spread |
| Material9 portal Dialog SSR | 23608 | 6657 | -71.5% | -71.5% | -71.5% | 2.9% | lower time in every pair, beyond control spread |
| Material9 inline Dialog SSR | 134118 | 66890 | -50.1% | -51% | -49.5% | 3.8% | lower time in every pair, beyond control spread |
| App7 closed Dialog SSR | 21603 | 4297 | -79.8% | -80.5% | -79.1% | 3.2% | lower time in every pair, beyond control spread |
| App7 portal Dialog SSR | 21095 | 4303 | -79.8% | -79.9% | -79.5% | 2.6% | lower time in every pair, beyond control spread |
| App7 inline Dialog SSR | 139082 | 58889 | -57.3% | -57.7% | -57.3% | 2.8% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-17T08:12:41.851Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 closed Dialog SSR | 14723 | 2568 | -82.3% | -82.8% | -82.2% | 6.5% | lower time in every pair, beyond control spread |
| Material9 portal Dialog SSR | 15601 | 2623 | -83.2% | -73.6% | -83.3% | 4.8% | lower time in every pair, beyond control spread |
| Material9 inline Dialog SSR | 100347 | 49350 | -51.8% | -51.8% | -51% | 3.4% | lower time in every pair, beyond control spread |
| App7 closed Dialog SSR | 15780 | 3050 | -80.7% | -80.1% | -81.2% | 4.4% | lower time in every pair, beyond control spread |
| App7 portal Dialog SSR | 16554 | 3212 | -80.1% | -80.1% | -81% | 0.7% | lower time in every pair, beyond control spread |
| App7 inline Dialog SSR | 103562 | 49081 | -52.5% | -52.5% | -51.9% | 1.6% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/dialog.cjs:

```sh
OUTPUT=packages/vmui-material/bench/dialog/node-isolated.json node packages/vmui-material/bench/dialog.cjs
OUTPUT=packages/vmui-material/bench/dialog/bun-isolated.json bun packages/vmui-material/bench/dialog.cjs
node scripts/render-bench-report.cjs packages/vmui-material dialog dialog.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
