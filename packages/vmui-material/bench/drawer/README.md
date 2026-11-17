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

Recorded 2026-11-17T18:11:31.897Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 permanent Drawer SSR | 38094 | 27392 | -28.1% | -30.2% | -27% | 4% | lower time in every pair, beyond control spread |
| Material9 persistent Drawer SSR | 39137 | 28196 | -27.3% | -26.7% | -28.5% | 53.5% | unestablished at this precision |
| Material9 temporary Drawer SSR | 72415 | 36175 | -50.1% | -50.1% | -49.4% | 53.6% | unestablished at this precision |
| App7 permanent Drawer SSR | 36889 | 23563 | -36.7% | -36.7% | -37.3% | 7.7% | lower time in every pair, beyond control spread |
| App7 persistent Drawer SSR | 38927 | 26147 | -33.5% | -32.8% | -34.2% | 12.3% | lower time in every pair, beyond control spread |
| App7 temporary Drawer SSR | 70002 | 33413 | -52.3% | -52.3% | -52.3% | 5.5% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-17T18:11:58.423Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 permanent Drawer SSR | 25566 | 18309 | -28.9% | -29.6% | -26.8% | 3.4% | lower time in every pair, beyond control spread |
| Material9 persistent Drawer SSR | 27398 | 19687 | -28.2% | -28.1% | -28.2% | 8.2% | lower time in every pair, beyond control spread |
| Material9 temporary Drawer SSR | 53832 | 29181 | -45.8% | -45.3% | -46.4% | 5.7% | lower time in every pair, beyond control spread |
| App7 permanent Drawer SSR | 28771 | 19460 | -32.4% | -32.4% | -32.3% | 6.2% | lower time in every pair, beyond control spread |
| App7 persistent Drawer SSR | 30976 | 21647 | -30.5% | -30.3% | -30.7% | 6% | lower time in every pair, beyond control spread |
| App7 temporary Drawer SSR | 57583 | 29565 | -48.7% | -48.8% | -48.7% | 3.1% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/drawer.cjs:

```sh
OUTPUT=packages/vmui-material/bench/drawer/node-isolated.json node packages/vmui-material/bench/drawer.cjs
OUTPUT=packages/vmui-material/bench/drawer/bun-isolated.json bun packages/vmui-material/bench/drawer.cjs
node scripts/render-bench-report.cjs packages/vmui-material drawer drawer.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
