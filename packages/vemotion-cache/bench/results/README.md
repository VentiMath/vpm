# vemotion-cache measurements

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
Negative changes mean less time; these are local CPU measurements, not
application throughput or latency guarantees.

## Node 24.22.1

Recorded 2026-11-01T10:48:12.870Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| construct default server cache | 152 | 245 | 62.5% | 65.1% | 45.7% | 2.1% | higher time in every pair, beyond control spread |
| construct application plugin server cache | 157 | 332 | 111.8% | 107.6% | 117.3% | 33.2% | higher time in every pair, beyond control spread |
| reuse compiled default style | 8 | 10 | 16.4% | 34.2% | 3.3% | 14.9% | unestablished at this precision |
| compile new default style | 3510 | 3203 | -8.9% | -10.9% | -8.1% | 20.1% | unestablished at this precision |
| compile new application layer style | 2598 | 2064 | -16.9% | -16.9% | -16.1% | 7.5% | lower time in every pair, beyond control spread |
| reuse compiled application layer style | 17 | 10 | -39.3% | -38% | -40.8% | 6% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T10:48:36.179Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| construct default server cache | 122 | 109 | -8.3% | -11.4% | -8.3% | 10% | unestablished at this precision |
| construct application plugin server cache | 118 | 129 | 8.8% | -0.8% | 15.7% | 16.7% | unestablished at this precision |
| reuse compiled default style | 5 | 16 | 227.2% | 230.5% | 212.5% | 32.6% | higher time in every pair, beyond control spread |
| compile new default style | 3230 | 3941 | 22.2% | 25.7% | 13.3% | 2.2% | unestablished at this precision |
| compile new application layer style | 2734 | 3146 | 14.9% | 15.1% | 5.4% | 7.7% | unestablished at this precision |
| reuse compiled application layer style | 11 | 16 | 44.3% | 44.3% | 40% | 5% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vemotion-cache/bench/results/node-isolated.json node packages/vemotion-cache/bench/compare.cjs
OUTPUT=packages/vemotion-cache/bench/results/bun-isolated.json bun packages/vemotion-cache/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vemotion-cache
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
