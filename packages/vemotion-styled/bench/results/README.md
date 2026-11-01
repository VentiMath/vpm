# vemotion-styled measurements

These records compare each complete Emotion stack. Each timed
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

Recorded 2026-11-01T09:31:51.642Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| construct DOM styled component | 198 | 165 | -16.1% | -8.9% | -29.9% | 24% | unestablished at this precision |
| construct inherited styled component | 165 | 176 | 6.7% | 7.4% | 5.9% | 3% | higher time in every pair, beyond control spread |
| server render cached static styles | 2576 | 2476 | -3.7% | -3.7% | -4.1% | 3.1% | lower time in every pair, beyond control spread |
| server render theme and prop interpolation | 2118 | 2093 | -1.4% | -1.7% | -1.1% | 2.8% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T09:32:09.291Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| construct DOM styled component | 105 | 92 | -12% | -13.8% | -10.8% | 1.3% | lower time in every pair, beyond control spread |
| construct inherited styled component | 131 | 113 | -13.4% | -13.4% | -14.4% | 6.6% | lower time in every pair, beyond control spread |
| server render cached static styles | 2006 | 2090 | 1.9% | 1.9% | 1.4% | 3.6% | unestablished at this precision |
| server render theme and prop interpolation | 1749 | 1803 | 4.3% | 6.6% | 3.5% | 5.3% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vemotion-styled/bench/results/node-isolated.json node packages/vemotion-styled/bench/compare.cjs
OUTPUT=packages/vemotion-styled/bench/results/bun-isolated.json bun packages/vemotion-styled/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vemotion-styled
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
