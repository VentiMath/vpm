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

Recorded 2026-11-10T06:45:55.140Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a repeated color mixer | 96 | 90 | -7.8% | -3.1% | -8.7% | 11.9% | unestablished at this precision |
| sample a prepared color mixer | 102 | 109 | 5.8% | 5.8% | 3.9% | 6% | unestablished at this precision |
| prepare and sample a repeated complex shadow mixer | 369 | 367 | -0.3% | 2% | -1.7% | 9.8% | unestablished at this precision |
| sample a prepared complex shadow mixer | 443 | 384 | -13.3% | -13.3% | -14.8% | 7.2% | lower time in every pair, beyond control spread |
| prepare color mixers with changing uncached endpoints | 935 | 626 | -32.2% | -32.2% | -25.9% | 7.1% | lower time in every pair, beyond control spread |
| prepare shadow mixers with changing uncached endpoints | 2902 | 1626 | -44.7% | -43.6% | -45.6% | 6% | lower time in every pair, beyond control spread |
| sample a prepared numeric interpolation | 14 | 14 | 0.4% | 6.5% | -6% | 2.7% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-10T06:46:27.577Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a repeated color mixer | 48 | 50 | 6.9% | 2.4% | 9.5% | 6.1% | unestablished at this precision |
| sample a prepared color mixer | 33 | 31 | -6.8% | -7.9% | 0.5% | 3% | unestablished at this precision |
| prepare and sample a repeated complex shadow mixer | 301 | 229 | -24% | -26.6% | -21.5% | 4.1% | lower time in every pair, beyond control spread |
| sample a prepared complex shadow mixer | 294 | 218 | -25.3% | -30% | -24% | 1.8% | lower time in every pair, beyond control spread |
| prepare color mixers with changing uncached endpoints | 732 | 329 | -55.4% | -57.8% | -54.7% | 4.8% | lower time in every pair, beyond control spread |
| prepare shadow mixers with changing uncached endpoints | 2055 | 1109 | -45.6% | -50.7% | -41.3% | 5.8% | lower time in every pair, beyond control spread |
| sample a prepared numeric interpolation | 7 | 7 | -1.2% | 2.7% | -5% | 5.3% | unestablished at this precision |

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

“Upstream” in this before/after report means immutable VPM commit `ca65b070`, reconstructed by `setup-baseline.cjs`. It is not the upstream Motion package.
