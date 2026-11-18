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

Recorded 2026-11-18T17:23:37.808Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 loading linear SSR | 93500 | 156429 | 69.9% | 71.2% | 66% | 1.8% | higher time in every pair, beyond control spread |
| Material9 capacity linear SSR | 78902 | 105160 | 33.5% | 23.1% | 41.5% | 3.5% | higher time in every pair, beyond control spread |
| Material9 buffer linear SSR | 137021 | 174381 | 28% | 36.5% | 25.4% | 3.3% | higher time in every pair, beyond control spread |
| App7 loading linear SSR | 93885 | 150206 | 60.1% | 60.1% | 60.1% | 3.8% | higher time in every pair, beyond control spread |
| App7 capacity linear SSR | 93694 | 103897 | 11.6% | 19.4% | 9.2% | 2.1% | higher time in every pair, beyond control spread |
| App7 buffer linear SSR | 126976 | 176950 | 39.5% | 41.7% | 38.5% | 3.2% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-18T17:24:02.923Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 loading linear SSR | 62827 | 112389 | 80.6% | 84.2% | 80.6% | 1.8% | higher time in every pair, beyond control spread |
| Material9 capacity linear SSR | 56727 | 84961 | 53.3% | 56.4% | 47.7% | 1.2% | higher time in every pair, beyond control spread |
| Material9 buffer linear SSR | 91492 | 139834 | 54.6% | 53.2% | 56.9% | 2.2% | higher time in every pair, beyond control spread |
| App7 loading linear SSR | 69000 | 114930 | 69.8% | 69.8% | 67% | 4.6% | higher time in every pair, beyond control spread |
| App7 capacity linear SSR | 64855 | 87982 | 36.9% | 36.9% | 35.7% | 3.5% | higher time in every pair, beyond control spread |
| App7 buffer linear SSR | 91923 | 148100 | 61.5% | 65.8% | 56.8% | 1.5% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/linear.cjs:

```sh
OUTPUT=packages/vmui-material/bench/linear/node-isolated.json node packages/vmui-material/bench/linear.cjs
OUTPUT=packages/vmui-material/bench/linear/bun-isolated.json bun packages/vmui-material/bench/linear.cjs
node scripts/render-bench-report.cjs packages/vmui-material linear linear.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
