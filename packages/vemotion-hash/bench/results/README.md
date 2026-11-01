# vemotion-hash measurements

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

Recorded 2026-11-01T07:23:47.524Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| ascii | 193 | 236 | 21.8% | 24.7% | 21.8% | 1.1% | higher time in every pair, beyond control spread |
| non-ASCII (different hash semantics) | 139 | 520 | 275.6% | 273.7% | 277.3% | 28.1% | higher time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T07:23:55.644Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| ascii | 158 | 103 | -35% | -34.8% | -35% | 0.5% | lower time in every pair, beyond control spread |
| non-ASCII (different hash semantics) | 111 | 112 | 0.4% | 0.5% | 0.4% | 0.6% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vemotion-hash/bench/results/node-isolated.json node packages/vemotion-hash/bench/compare.cjs
OUTPUT=packages/vemotion-hash/bench/results/bun-isolated.json bun packages/vemotion-hash/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vemotion-hash
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
