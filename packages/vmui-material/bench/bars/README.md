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

Recorded 2026-11-19T05:26:03.784Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 header AppBar/Toolbar SSR | 114049 | 149630 | 31.2% | 35.2% | 28.2% | 4.5% | higher time in every pair, beyond control spread |
| Material9 footer AppBar/Toolbar SSR | 107388 | 126191 | 17.9% | 17.9% | 16.7% | 1.9% | higher time in every pair, beyond control spread |
| Material9 toolbar AppBar/Toolbar SSR | 31555 | 41582 | 31.8% | 35.5% | 28.1% | 3.3% | higher time in every pair, beyond control spread |
| App7 header AppBar/Toolbar SSR | 107618 | 136492 | 26.3% | 25.9% | 27.2% | 6.6% | higher time in every pair, beyond control spread |
| App7 footer AppBar/Toolbar SSR | 106093 | 125308 | 18.1% | 18.6% | 17.4% | 3.7% | higher time in every pair, beyond control spread |
| App7 toolbar AppBar/Toolbar SSR | 31491 | 41237 | 27.8% | 32.3% | 27.6% | 8.2% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-19T05:26:36.104Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 header AppBar/Toolbar SSR | 81777 | 100386 | 23.6% | 27.7% | 18.3% | 2.5% | higher time in every pair, beyond control spread |
| Material9 footer AppBar/Toolbar SSR | 82405 | 99951 | 20.7% | 24.9% | 16.4% | 4.9% | higher time in every pair, beyond control spread |
| Material9 toolbar AppBar/Toolbar SSR | 23306 | 33352 | 43.1% | 44.5% | 41.1% | 3.6% | higher time in every pair, beyond control spread |
| App7 header AppBar/Toolbar SSR | 80621 | 102825 | 26.4% | 25.6% | 29.9% | 1.6% | higher time in every pair, beyond control spread |
| App7 footer AppBar/Toolbar SSR | 80953 | 102551 | 26.8% | 26.3% | 27.6% | 1.4% | higher time in every pair, beyond control spread |
| App7 toolbar AppBar/Toolbar SSR | 24926 | 33249 | 35.6% | 34.5% | 36.2% | 1.2% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/bars.cjs:

```sh
OUTPUT=packages/vmui-material/bench/bars/node-isolated.json node packages/vmui-material/bench/bars.cjs
OUTPUT=packages/vmui-material/bench/bars/bun-isolated.json bun packages/vmui-material/bench/bars.cjs
node scripts/render-bench-report.cjs packages/vmui-material bars bars.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
