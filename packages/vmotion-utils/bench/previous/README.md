# vmotion-utils: previous implementation comparison

Here “upstream” means the **previous VPM implementation**, reconstructed from
commit `453b9dfd0926c95afaf959cc9a5e7ce0bb50bc21`. Both variants run on the same
runtime. This isolates code changes from earlier runtime or machine conditions.

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

Recorded 2026-11-09T17:58:23.402Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Bezier creation | 9 | 8 | -5.6% | -3.2% | -5.6% | 4.6% | unestablished at this precision |
| easing 100 animation samples | 1923 | 1935 | 0.1% | -0.8% | 2.2% | 4% | unestablished at this precision |
| four-stage value pipeline | 14 | 14 | -0.4% | -2.1% | 0.4% | 2.6% | unestablished at this precision |
| notify 1 listener | 6 | 6 | -0.6% | -0.5% | -0.7% | 24.1% | unestablished at this precision |
| notify 32 listeners | 89 | 100 | 11.3% | 11.3% | 12% | 110.3% | unestablished at this precision |
| 32 listener register/remove cycle | 720 | 734 | 0.4% | -3.4% | 4.2% | 3.4% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-09T17:58:46.401Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Bezier creation | 10 | 6 | -38.7% | -41.4% | -33.1% | 16.1% | lower time in every pair, beyond control spread |
| easing 100 animation samples | 2093 | 2021 | -2.5% | -1% | -3.4% | 5% | unestablished at this precision |
| four-stage value pipeline | 12 | 12 | 1.5% | 1.5% | 1.1% | 3.5% | unestablished at this precision |
| notify 1 listener | 7 | 5 | -33.7% | -35.5% | -33.6% | 0.6% | lower time in every pair, beyond control spread |
| notify 32 listeners | 87 | 87 | 0.4% | -0.7% | 0.8% | 3.4% | unestablished at this precision |
| 32 listener register/remove cycle | 688 | 671 | -2.5% | -0.7% | -9.3% | 3.2% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
VMOTION_BENCH_PREVIOUS=1 OUTPUT=packages/vmotion-utils/bench/previous/node-isolated.json node packages/vmotion-utils/bench/compare.cjs
VMOTION_BENCH_PREVIOUS=1 OUTPUT=packages/vmotion-utils/bench/previous/bun-isolated.json bun packages/vmotion-utils/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vmotion-utils previous compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
