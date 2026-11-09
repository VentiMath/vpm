# vmotion-utils measurements

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

Recorded 2026-11-09T17:19:05.948Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Bezier creation | 9 | 9 | 7.1% | 7.1% | 6.4% | 3.9% | higher time in every pair, beyond control spread |
| easing 100 animation samples | 1867 | 2008 | 5.9% | 5.9% | 7.9% | 0.6% | higher time in every pair, beyond control spread |
| four-stage value pipeline | 38 | 14 | -62.9% | -62.9% | -62.8% | 3.9% | lower time in every pair, beyond control spread |
| notify 1 listener | 5 | 6 | 13.9% | 12.6% | 18.9% | 3.3% | higher time in every pair, beyond control spread |
| notify 32 listeners | 90 | 92 | 1.9% | 26.2% | 1.9% | 1.9% | unestablished at this precision |
| 32 listener register/remove cycle | 1184 | 752 | -36.7% | -33.4% | -36.7% | 3.7% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T17:19:48.625Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Bezier creation | 7 | 11 | 76.4% | 79.9% | 72% | 4.2% | higher time in every pair, beyond control spread |
| easing 100 animation samples | 1932 | 2170 | 11.8% | 11.7% | 12.4% | 4.5% | higher time in every pair, beyond control spread |
| four-stage value pipeline | 18 | 12 | -34.2% | -34.5% | -34.1% | 0.4% | lower time in every pair, beyond control spread |
| notify 1 listener | 4 | 8 | 67.4% | 64.8% | 68.9% | 1.2% | higher time in every pair, beyond control spread |
| notify 32 listeners | 83 | 88 | 5.6% | 5.3% | 6% | 2.8% | unestablished at this precision |
| 32 listener register/remove cycle | 890 | 701 | -21% | -20.8% | -21% | 3.8% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vmotion-utils/bench/results/node-isolated.json node packages/vmotion-utils/bench/compare.cjs
OUTPUT=packages/vmotion-utils/bench/results/bun-isolated.json bun packages/vmotion-utils/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vmotion-utils results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
