# vmotion-dom measurements

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

Recorded 2026-11-10T04:25:00.471Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a repeated color mixer | 747 | 90 | -88% | -88.2% | -87.8% | 3.1% | lower time in every pair, beyond control spread |
| sample a prepared color mixer | 105 | 103 | -2.2% | -6.6% | 3% | 2.6% | unestablished at this precision |
| prepare and sample a repeated complex shadow mixer | 3282 | 381 | -88.6% | -88.7% | -87.6% | 3.3% | lower time in every pair, beyond control spread |
| sample a prepared complex shadow mixer | 457 | 440 | -3.6% | -3.8% | -1.7% | 24% | unestablished at this precision |
| prepare color mixers with changing uncached endpoints | 1078 | 1381 | 27.8% | 27.8% | 27.9% | 61.5% | unestablished at this precision |
| prepare shadow mixers with changing uncached endpoints | 2951 | 3146 | 7% | 1.1% | 7.9% | 5% | unestablished at this precision |
| sample a prepared numeric interpolation | 14 | 14 | 0.6% | 3.6% | -2.4% | 4.5% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-10T04:25:37.164Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a repeated color mixer | 628 | 46 | -92.6% | -93% | -92.6% | 0.9% | lower time in every pair, beyond control spread |
| sample a prepared color mixer | 32 | 34 | 4.7% | 4.7% | 5.9% | 3.1% | unestablished at this precision |
| prepare and sample a repeated complex shadow mixer | 2121 | 320 | -84.7% | -84.7% | -84.9% | 2.7% | lower time in every pair, beyond control spread |
| sample a prepared complex shadow mixer | 290 | 300 | 4% | -1.2% | 4.3% | 1.6% | unestablished at this precision |
| prepare color mixers with changing uncached endpoints | 871 | 992 | 13.9% | 8.3% | 17.6% | 0.5% | higher time in every pair, beyond control spread |
| prepare shadow mixers with changing uncached endpoints | 2047 | 1981 | -4.1% | -4.3% | 0.1% | 4.6% | unestablished at this precision |
| sample a prepared numeric interpolation | 7 | 4 | -30.6% | -0.6% | -61.8% | 2.3% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/mixers.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/mixers-previous/node-isolated.json node packages/vmotion-dom/bench/mixers.cjs
OUTPUT=packages/vmotion-dom/bench/mixers-previous/bun-isolated.json bun packages/vmotion-dom/bench/mixers.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom mixers-previous mixers.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
