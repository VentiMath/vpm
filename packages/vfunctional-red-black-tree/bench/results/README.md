# vfunctional-red-black-tree measurements

These records supersede the earlier same-process comparison. Each timed
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
Negative changes mean less time; these are local CPU measurements, not
application throughput or latency guarantees.

## Node 24.22.1

Recorded 2026-11-01T09:49:00.205Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| build / 1,000 sequential inserts | 150976 | 151037 | 0.8% | 9.9% | -0.4% | 1.5% | unestablished at this precision |
| build / 1,000 shuffled inserts | 176458 | 175364 | -1.2% | -2.5% | -1.2% | 2.2% | unestablished at this precision |
| lookup / 64 get in 10,000 | 2165 | 2138 | 0.1% | -3.8% | 1.4% | 0.5% | unestablished at this precision |
| lookup / 64 find().index in 10,000 | 5449 | 5531 | 2.8% | 1.2% | 3.6% | 34.3% | unestablished at this precision |
| position / 64 at() in 10,000 | 3931 | 3177 | -20.1% | -18.5% | -21.2% | 29.8% | unestablished at this precision |
| traverse / keys of 1,000 | 8425 | 6609 | -21% | -19.7% | -23.9% | 13.3% | lower time in every pair, beyond control spread |
| traverse / forEach range 250-750 | 3375 | 2729 | -18.2% | -18.2% | -18.9% | 9.2% | lower time in every pair, beyond control spread |
| remove / 64 persistent removals from 1,000 | 7304 | 7257 | -0.7% | -0.7% | -1.4% | 2.8% | unestablished at this precision |
| Firestore Watch / 100 document changes in 1,000 | 101915 | 99429 | -1.4% | -1.4% | -3.9% | 2.3% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T09:49:36.183Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| build / 1,000 sequential inserts | 269199 | 294297 | 10.2% | -1.8% | 18.2% | 3.5% | unestablished at this precision |
| build / 1,000 shuffled inserts | 232926 | 244932 | 1.6% | 0.9% | 7.9% | 8.6% | unestablished at this precision |
| lookup / 64 get in 10,000 | 1064 | 1060 | 0.1% | 3.2% | -1.9% | 7.8% | unestablished at this precision |
| lookup / 64 find().index in 10,000 | 4948 | 4935 | -0.1% | 3.4% | -1.8% | 6.1% | unestablished at this precision |
| position / 64 at() in 10,000 | 3196 | 2915 | -10.9% | 2.2% | -13.2% | 9.9% | unestablished at this precision |
| traverse / keys of 1,000 | 5332 | 7876 | 44.1% | 60.2% | -8.9% | 1.7% | unestablished at this precision |
| traverse / forEach range 250-750 | 2378 | 2723 | 11.3% | 17.8% | -5.2% | 3.9% | unestablished at this precision |
| remove / 64 persistent removals from 1,000 | 15916 | 17007 | 1.2% | 1.2% | 14.3% | 20.5% | unestablished at this precision |
| Firestore Watch / 100 document changes in 1,000 | 160105 | 146074 | -8.1% | -12.3% | -7.6% | 16.7% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vfunctional-red-black-tree/bench/results/node-isolated.json node packages/vfunctional-red-black-tree/bench/compare.cjs
OUTPUT=packages/vfunctional-red-black-tree/bench/results/bun-isolated.json bun packages/vfunctional-red-black-tree/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vfunctional-red-black-tree
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
