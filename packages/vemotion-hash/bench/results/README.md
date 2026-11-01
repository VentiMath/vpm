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

Recorded 2026-11-01T09:47:48.139Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| ascii | 158 | 156 | -1.3% | 0.7% | -2.4% | 1.4% | unestablished at this precision |
| non-ASCII (different hash semantics) | 115 | 392 | 240.7% | 241.1% | 240% | 0.9% | higher time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T09:47:56.166Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| ascii | 132 | 86 | -35.6% | -35.3% | -35.7% | 0.7% | lower time in every pair, beyond control spread |
| non-ASCII (different hash semantics) | 94 | 93 | -1.7% | -0.3% | -1.8% | 1.2% | unestablished at this precision |

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
