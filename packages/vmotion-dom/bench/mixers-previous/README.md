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

Recorded 2026-11-10T04:35:18.399Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a repeated color mixer | 752 | 89 | -88.1% | -88% | -88.2% | 4.3% | lower time in every pair, beyond control spread |
| sample a prepared color mixer | 103 | 103 | 3% | -1.7% | 3.8% | 1% | unestablished at this precision |
| prepare and sample a repeated complex shadow mixer | 3238 | 367 | -88.6% | -89.2% | -88.5% | 3.7% | lower time in every pair, beyond control spread |
| sample a prepared complex shadow mixer | 445 | 433 | -1.8% | -2.9% | -1.8% | 2% | unestablished at this precision |
| prepare color mixers with changing uncached endpoints | 1083 | 930 | -14.1% | -11.5% | -17.8% | 8.5% | lower time in every pair, beyond control spread |
| prepare shadow mixers with changing uncached endpoints | 2924 | 2996 | 1.2% | 2.1% | -8.3% | 10.1% | unestablished at this precision |
| sample a prepared numeric interpolation | 14 | 14 | 0.2% | 4.6% | -4.1% | 7.1% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-10T04:35:58.099Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a repeated color mixer | 634 | 43 | -93.2% | -93.3% | -93.1% | 5.8% | lower time in every pair, beyond control spread |
| sample a prepared color mixer | 32 | 33 | 1.9% | 1% | 2.7% | 5.7% | unestablished at this precision |
| prepare and sample a repeated complex shadow mixer | 2154 | 309 | -85.3% | -85.7% | -85.3% | 18% | lower time in every pair, beyond control spread |
| sample a prepared complex shadow mixer | 284 | 291 | 1.4% | 3.4% | 0.5% | 2.6% | unestablished at this precision |
| prepare color mixers with changing uncached endpoints | 901 | 755 | -16.2% | -16.2% | -18% | 11.4% | lower time in every pair, beyond control spread |
| prepare shadow mixers with changing uncached endpoints | 2014 | 1969 | 0.3% | -3.8% | 5.3% | 17.8% | unestablished at this precision |
| sample a prepared numeric interpolation | 9 | 4 | -56.9% | -27.3% | -62.4% | 4.3% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/mixers.cjs:

```sh
VMOTION_MIXERS_PREVIOUS=1 OUTPUT=packages/vmotion-dom/bench/mixers-previous/node-isolated.json node packages/vmotion-dom/bench/mixers.cjs
VMOTION_MIXERS_PREVIOUS=1 OUTPUT=packages/vmotion-dom/bench/mixers-previous/bun-isolated.json bun packages/vmotion-dom/bench/mixers.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom mixers-previous mixers.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.

This before/after suite uses immutable VPM commit `a3c16a08` as the column labelled “Upstream”; it is not the upstream package. The environment flag in the reproduction commands selects that baseline. Historical source hashes identify the recorded implementation.
