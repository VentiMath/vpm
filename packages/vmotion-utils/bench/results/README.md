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

Recorded 2026-11-09T17:24:40.478Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Bezier creation | 9 | 9 | 2.8% | 7.3% | -1.1% | 5.4% | unestablished at this precision |
| easing 100 animation samples | 1903 | 1985 | 3.1% | -14.7% | 7.6% | 2% | unestablished at this precision |
| four-stage value pipeline | 38 | 14 | -62.4% | -1.4% | -62.7% | 1.1% | unestablished at this precision |
| notify 1 listener | 6 | 6 | 10.8% | 14.3% | 10.8% | 82.3% | unestablished at this precision |
| notify 32 listeners | 92 | 92 | 1.5% | 6.3% | -0.5% | 7.1% | unestablished at this precision |
| 32 listener register/remove cycle | 1201 | 752 | -36.8% | -36.8% | -38.9% | 9.4% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-09T17:25:04.182Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Bezier creation | 7 | 12 | 74.2% | 84.2% | 67.9% | 7% | higher time in every pair, beyond control spread |
| easing 100 animation samples | 1922 | 2198 | 14.4% | 13% | 120.9% | 41.5% | unestablished at this precision |
| four-stage value pipeline | 18 | 12 | -34.2% | -34.3% | -27% | 2.4% | lower time in every pair, beyond control spread |
| notify 1 listener | 5 | 7 | 65.5% | 65.5% | 86.4% | 1.8% | higher time in every pair, beyond control spread |
| notify 32 listeners | 84 | 88 | 6% | 4% | 7.5% | 3.5% | unestablished at this precision |
| 32 listener register/remove cycle | 901 | 708 | -22% | -23.4% | -22% | 2.4% | lower time in every pair, beyond control spread |

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
