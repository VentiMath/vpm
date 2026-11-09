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

Recorded 2026-11-09T17:57:35.981Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Bezier creation | 8 | 8 | -2.6% | -0.2% | -4.7% | 8.9% | unestablished at this precision |
| easing 100 animation samples | 1835 | 1902 | 3.6% | 3.2% | 3.6% | 0.6% | unestablished at this precision |
| four-stage value pipeline | 37 | 14 | -63.2% | -63.1% | -63.2% | 2% | lower time in every pair, beyond control spread |
| notify 1 listener | 5 | 6 | 11.5% | 10.9% | 12.5% | 0.9% | higher time in every pair, beyond control spread |
| notify 32 listeners | 89 | 98 | 10.1% | 8.8% | 11% | 0.9% | higher time in every pair, beyond control spread |
| 32 listener register/remove cycle | 1145 | 717 | -37.3% | -38.3% | -37.3% | 2.8% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T17:57:58.921Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Bezier creation | 6 | 6 | 3.1% | 2.4% | 11.9% | 21.3% | unestablished at this precision |
| easing 100 animation samples | 1905 | 2042 | 7.2% | 9.2% | 6.4% | 11.3% | unestablished at this precision |
| four-stage value pipeline | 18 | 12 | -34.3% | -34% | -35% | 34% | lower time in every pair, beyond control spread |
| notify 1 listener | 4 | 5 | 7.4% | 9.9% | 5.4% | 1.3% | higher time in every pair, beyond control spread |
| notify 32 listeners | 85 | 87 | 3.6% | 3.3% | 5.6% | 0.9% | unestablished at this precision |
| 32 listener register/remove cycle | 883 | 679 | -22.7% | -20% | -23.2% | 1.8% | lower time in every pair, beyond control spread |

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
