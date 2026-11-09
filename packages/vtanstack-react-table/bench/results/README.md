# vtanstack-react-table measurements

These recordings used the former React 19.1 fixture at commit
[`afc35d2`](https://github.com/VentiMath/vpm/commit/afc35d2a3536f535a88736e53be616809934967c).
Current correctness/release checks use React 19.3.1. Reproduce these historical
measurements from that revision; they do not establish current-baseline speedups.

Measured November 8, 2026 after the resource/contest caller fixes. `useTable`
and `useLegacyTable` compare current React Table 9.3.1; `useReactTable` compares
the application's 8.20.6. All use React 19.1.0, identical rows/sort state and
assert identical complete HTML. Timings include core construction, sorting
and React server rendering; they do not isolate adapter overhead or measure
browser responsiveness.

The app's v8 path shows no established difference on either runtime. Current
v9's 100-row path takes 23% more time on Node (683 µs versus 558 µs). Bun's
10-row current path and both legacy paths are faster. Other differences are
inconclusive, including a Node legacy case with a 90.5% identical-source
control spread. No general speedup is claimed.

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

Recorded 2026-11-08T21:23:53.981Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| useTable SSR 10 rows | 130403 | 129696 | 0.6% | 0.6% | 0.9% | 7.3% | unestablished at this precision |
| useTable SSR 100 rows | 557998 | 683161 | 23% | 21.4% | 23% | 9.7% | higher time in every pair, beyond control spread |
| useReactTable SSR 10 rows | 91155 | 105511 | 15.5% | 26% | 7.6% | 65.6% | unestablished at this precision |
| useReactTable SSR 100 rows | 601350 | 679188 | 8.8% | -9.6% | 12.9% | 2% | unestablished at this precision |
| useLegacyTable SSR 10 rows | 303090 | 136298 | -54.4% | -59.7% | -52.7% | 90.5% | unestablished at this precision |
| useLegacyTable SSR 100 rows | 715182 | 668877 | -6.7% | -6.7% | -5.5% | 3.6% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-08T21:24:30.262Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| useTable SSR 10 rows | 86109 | 57717 | -33% | -32.8% | -33.2% | 20.2% | lower time in every pair, beyond control spread |
| useTable SSR 100 rows | 271692 | 273829 | 1.5% | 3% | -0.9% | 3.2% | unestablished at this precision |
| useReactTable SSR 10 rows | 54277 | 53382 | -1.1% | -3.9% | 0.2% | 10.7% | unestablished at this precision |
| useReactTable SSR 100 rows | 310097 | 277794 | -10.4% | -11.6% | -7.7% | 6.7% | unestablished at this precision |
| useLegacyTable SSR 10 rows | 232266 | 63359 | -72.7% | -74.3% | -71.4% | 12.1% | lower time in every pair, beyond control spread |
| useLegacyTable SSR 100 rows | 457925 | 293804 | -35.6% | -38.9% | -34.1% | 8.8% | lower time in every pair, beyond control spread |

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
