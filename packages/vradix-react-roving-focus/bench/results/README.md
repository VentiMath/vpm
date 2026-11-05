# vradix-react-roving-focus measurements

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

Recorded 2026-11-05T06:54:15.503Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR 16 items | 110939 | 52125 | -52.9% | -51.2% | -54.9% | 4.1% | lower time in every pair, beyond control spread |
| unchanged 16 items | 124893 | 61844 | -51.1% | -48.3% | -55.6% | 11% | lower time in every pair, beyond control spread |
| controlled tab stop 16 items | 129206 | 65390 | -49% | -45.7% | -56.6% | 13.2% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-05T06:55:36.925Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR 16 items | 51622 | 39342 | -23.2% | -21.6% | -26.6% | 4.2% | lower time in every pair, beyond control spread |
| unchanged 16 items | 69080 | 43489 | -37.3% | -38.7% | -35.4% | 3.6% | lower time in every pair, beyond control spread |
| controlled tab stop 16 items | 71742 | 44077 | -38% | -38% | -37.7% | 0.7% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vradix-react-roving-focus/bench/results/node-isolated.json node packages/vradix-react-roving-focus/bench/compare.cjs
OUTPUT=packages/vradix-react-roving-focus/bench/results/bun-isolated.json bun packages/vradix-react-roving-focus/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-roving-focus results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
