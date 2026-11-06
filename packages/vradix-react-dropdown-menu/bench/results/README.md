# vradix-react-dropdown-menu measurements

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

Recorded 2026-11-06T01:49:41.273Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| closed trigger SSR | 41919 | 27209 | -35.1% | -34.7% | -35.9% | 2.4% | lower time in every pair, beyond control spread |
| open 16 items SSR | 570870 | 269319 | -53% | -51.6% | -53.3% | 4.4% | lower time in every pair, beyond control spread |
| unchanged 16 items | 645270 | 341388 | -47.3% | -47.4% | -47.3% | 10.9% | lower time in every pair, beyond control spread |
| canceled selection | 26465 | 27092 | 4.4% | 1.8% | 4.4% | 2.2% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-06T01:50:04.009Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| closed trigger SSR | 16327 | 12702 | -21.1% | -23.2% | -20.1% | 2.7% | lower time in every pair, beyond control spread |
| open 16 items SSR | 243992 | 164885 | -32.4% | -35.1% | -31.2% | 4.2% | lower time in every pair, beyond control spread |
| unchanged 16 items | 296013 | 189687 | -35.2% | -40% | -30.7% | 13.6% | lower time in every pair, beyond control spread |
| canceled selection | 10565 | 10680 | 1.5% | 3.6% | 1.5% | 6.9% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vradix-react-dropdown-menu/bench/results/node-isolated.json node packages/vradix-react-dropdown-menu/bench/compare.cjs
OUTPUT=packages/vradix-react-dropdown-menu/bench/results/bun-isolated.json bun packages/vradix-react-dropdown-menu/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-dropdown-menu results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
