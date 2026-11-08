# vtanstack-react-table measurements

Measured November 8, 2026. `useTable` and `useLegacyTable` compare current
React Table 9.3.1; `useReactTable` compares the application’s 8.20.6. All use
React 19.1.0, the same rows/sort state, and assert identical complete HTML.
These timings include core construction, sorting and React server rendering;
they do not isolate adapter overhead or measure browser responsiveness.

Most current/v8 differences are inconclusive under the identical-source control
spread. The ten-row v9 legacy path is faster on both runtimes; the hundred-row
v9 legacy path and ten-row current path are also faster on Bun. There is no general speedup claim.

Build the pinned SSR controls first with
`bun scripts/react-table-conformance/build.cjs`.

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

Recorded 2026-11-08T19:21:59.162Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| useTable SSR 10 rows | 146995 | 142548 | -3% | 4.5% | -14% | 13.5% | unestablished at this precision |
| useTable SSR 100 rows | 610918 | 761854 | 27.8% | 31.8% | 14.9% | 6.4% | unestablished at this precision |
| useReactTable SSR 10 rows | 166441 | 156011 | -6.4% | -11.8% | -5.8% | 64.8% | unestablished at this precision |
| useReactTable SSR 100 rows | 644562 | 688004 | 8.4% | 9.1% | 6.8% | 19.1% | unestablished at this precision |
| useLegacyTable SSR 10 rows | 381378 | 160792 | -52.8% | -44% | -57.7% | 26.6% | lower time in every pair, beyond control spread |
| useLegacyTable SSR 100 rows | 762831 | 861688 | 13% | -0.5% | 23.8% | 4.9% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-08T19:22:31.702Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| useTable SSR 10 rows | 101084 | 60956 | -39.9% | -34.9% | -39.9% | 16% | lower time in every pair, beyond control spread |
| useTable SSR 100 rows | 318858 | 317704 | 0.4% | 0.4% | -4.2% | 9.8% | unestablished at this precision |
| useReactTable SSR 10 rows | 66516 | 59458 | -10.4% | -1.1% | -11.6% | 17.3% | unestablished at this precision |
| useReactTable SSR 100 rows | 336941 | 314778 | -3.3% | -5.9% | 0.4% | 25.4% | unestablished at this precision |
| useLegacyTable SSR 10 rows | 262001 | 76216 | -71% | -73.3% | -53.6% | 29.3% | lower time in every pair, beyond control spread |
| useLegacyTable SSR 100 rows | 505809 | 339042 | -31.6% | -34.2% | -31.6% | 25.3% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vtanstack-react-table/bench/results/node-isolated.json node packages/vtanstack-react-table/bench/compare.cjs
OUTPUT=packages/vtanstack-react-table/bench/results/bun-isolated.json bun packages/vtanstack-react-table/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vtanstack-react-table results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
