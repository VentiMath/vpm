# vmotion-dom before/after measurements

The **Upstream** column is immutable VPM commit `a518e8ef`, not Motion.

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

Recorded 2026-11-10T07:11:54.963Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a repeated color mixer | 88 | 95 | 7.2% | 9.6% | 6.3% | 3.9% | higher time in every pair, beyond control spread |
| sample a prepared color mixer | 108 | 91 | -15.9% | -15.9% | -16% | 3.3% | lower time in every pair, beyond control spread |
| prepare and sample a repeated complex shadow mixer | 369 | 366 | -0.5% | -2.7% | 0% | 10.5% | unestablished at this precision |
| sample a prepared complex shadow mixer | 377 | 356 | -5.7% | -4.7% | -5.7% | 8.4% | unestablished at this precision |
| prepare color mixers with changing uncached endpoints | 615 | 593 | -3.7% | -2.9% | -3.8% | 28.5% | unestablished at this precision |
| prepare shadow mixers with changing uncached endpoints | 1578 | 1555 | -2.4% | -1.2% | -3.5% | 4% | unestablished at this precision |
| sample a prepared numeric interpolation | 14 | 14 | 1.6% | 4.4% | -1.9% | 25.3% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-10T07:12:27.320Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a repeated color mixer | 52 | 48 | -7.5% | -7.5% | -7.7% | 0.3% | lower time in every pair, beyond control spread |
| sample a prepared color mixer | 31 | 33 | 3.6% | 0.7% | 7.2% | 2.4% | unestablished at this precision |
| prepare and sample a repeated complex shadow mixer | 233 | 236 | 1.2% | -5.5% | 5.1% | 5.1% | unestablished at this precision |
| sample a prepared complex shadow mixer | 218 | 206 | -5.9% | -5.9% | -5% | 1.5% | lower time in every pair, beyond control spread |
| prepare color mixers with changing uncached endpoints | 322 | 314 | -2.3% | -2.8% | -2% | 1.6% | unestablished at this precision |
| prepare shadow mixers with changing uncached endpoints | 1129 | 1118 | -0.2% | -3.4% | 2.4% | 1.3% | unestablished at this precision |
| sample a prepared numeric interpolation | 9 | 9 | 1.9% | 24.9% | 1.7% | 0.9% | unestablished at this precision |

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
