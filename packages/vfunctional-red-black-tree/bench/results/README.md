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

Recorded 2026-11-01T07:01:50.895Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| build / 1,000 sequential inserts | 160124 | 208983 | 16.8% | 49.1% | -15.5% | 132% | unestablished at this precision |
| build / 1,000 shuffled inserts | 224925 | 255649 | 18.7% | 53.3% | -14.3% | 135.9% | unestablished at this precision |
| lookup / 64 get in 10,000 | 2288 | 2432 | 0.4% | 12% | -20.3% | 17.4% | unestablished at this precision |
| lookup / 64 find().index in 10,000 | 5859 | 7739 | 12.1% | 130.9% | -24.6% | 237% | unestablished at this precision |
| position / 64 at() in 10,000 | 6480 | 5960 | -5% | 21.3% | -27.8% | 10.6% | unestablished at this precision |
| traverse / keys of 1,000 | 10164 | 10186 | 3.2% | 26.1% | -4.7% | 341.9% | unestablished at this precision |
| traverse / forEach range 250-750 | 3861 | 3171 | -14.5% | -28.5% | 249.6% | 3% | unestablished at this precision |
| remove / 64 persistent removals from 1,000 | 9681 | 8802 | -4.5% | -4.5% | 314.4% | 45.7% | unestablished at this precision |
| Firestore Watch / 100 document changes in 1,000 | 135200 | 130858 | -1.5% | -19% | 89.1% | 121.9% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T07:02:34.973Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| build / 1,000 sequential inserts | 387009 | 394224 | -8% | -8% | -1.9% | 8.3% | unestablished at this precision |
| build / 1,000 shuffled inserts | 464968 | 307933 | -21.8% | -50.2% | -2% | 154.5% | unestablished at this precision |
| lookup / 64 get in 10,000 | 1261 | 1743 | 8.5% | -34.2% | 38.3% | 162.2% | unestablished at this precision |
| lookup / 64 find().index in 10,000 | 7323 | 7056 | -8.3% | -17.3% | 153.3% | 69.7% | unestablished at this precision |
| position / 64 at() in 10,000 | 4289 | 3771 | -11.6% | -48.9% | 94.6% | 712.6% | unestablished at this precision |
| traverse / keys of 1,000 | 7952 | 13117 | 66.5% | 36.1% | 137.1% | 98.7% | unestablished at this precision |
| traverse / forEach range 250-750 | 2849 | 3582 | 18.4% | 14.6% | 28.3% | 1405.3% | unestablished at this precision |
| remove / 64 persistent removals from 1,000 | 16997 | 28052 | 61.5% | 61.5% | 53.7% | 376.5% | unestablished at this precision |
| Firestore Watch / 100 document changes in 1,000 | 199265 | 176117 | -4.5% | -25.3% | -0.1% | 41% | unestablished at this precision |

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
