# vfirebase-functions measurements

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

Recorded 2026-11-01T09:24:23.486Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 475 | 341 | -27.9% | -26.3% | -27.9% | 1.3% | lower time in every pair, beyond control spread |
| logger / structured request | 562 | 585 | 4.8% | 7% | -23.3% | 5.6% | unestablished at this precision |
| logger / nested data | 6453 | 4167 | -35.4% | -34.3% | -36.4% | 2.3% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 49 | 55 | 14.1% | 16.4% | 10% | 1.7% | higher time in every pair, beyond control spread |
| declaration / HTTP endpoint | 932 | 788 | -16.1% | -13.7% | -17.6% | 2.8% | lower time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 46880 | 52788 | 11.8% | 11.7% | 11.8% | 2.5% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 224 | 223 | -0.8% | 6% | -6.2% | 3.7% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T09:24:51.832Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| logger / formatted status | 569 | 544 | -5.1% | -5.2% | -4.9% | 22.3% | unestablished at this precision |
| logger / structured request | 239 | 241 | 0.5% | 2.4% | 0.5% | 6.1% | unestablished at this precision |
| logger / nested data | 7055 | 3648 | -48.6% | -48.7% | -47.5% | 6.2% | lower time in every pair, beyond control spread |
| initializer / already initialized handler | 61 | 67 | 10.3% | 8.1% | 12.4% | 7.3% | unestablished at this precision |
| declaration / HTTP endpoint | 388 | 468 | 19.7% | 19.7% | 21.3% | 6.7% | higher time in every pair, beyond control spread |
| declaration / serialize 64 fresh endpoints | 37514 | 59101 | 56.9% | 57.1% | 56.9% | 3.1% | higher time in every pair, beyond control spread |
| request / initialized HTTP handler | 251 | 270 | 5.7% | 5.5% | 7.6% | 5.1% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vfirebase-functions/bench/results/node-isolated.json node packages/vfirebase-functions/bench/compare.cjs
OUTPUT=packages/vfirebase-functions/bench/results/bun-isolated.json bun packages/vfirebase-functions/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vfirebase-functions
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
