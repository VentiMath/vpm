# vradix-react-collection measurements

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

Recorded 2026-11-04T16:36:22.150Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR 16 items | 40576 | 18542 | -53.8% | -53.2% | -55.5% | 2.9% | lower time in every pair, beyond control spread |
| read 16 items | 15223 | 14759 | -3.4% | -3.1% | -3.7% | 5.7% | unestablished at this precision |
| read 256 items | 232728 | 212225 | -8.8% | -8.8% | -8.5% | 5% | lower time in every pair, beyond control spread |
| unchanged 16-item render | 53246 | 27390 | -49% | -49.6% | -47.1% | 6.6% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-04T16:36:43.703Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR 16 items | 18557 | 16317 | -11.6% | -12% | -11.6% | 4.7% | lower time in every pair, beyond control spread |
| read 16 items | 10681 | 10101 | -5.5% | -4.1% | -6.3% | 5% | unestablished at this precision |
| read 256 items | 184338 | 171437 | -6.7% | -7.3% | -6.6% | 1.9% | lower time in every pair, beyond control spread |
| unchanged 16-item render | 24652 | 20902 | -16.2% | -12.1% | -20.9% | 2.1% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vradix-react-collection/bench/results/node-isolated.json node packages/vradix-react-collection/bench/compare.cjs
OUTPUT=packages/vradix-react-collection/bench/results/bun-isolated.json bun packages/vradix-react-collection/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-collection results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
