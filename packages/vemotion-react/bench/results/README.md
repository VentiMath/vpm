# vemotion-react measurements

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

Recorded 2026-11-01T11:09:06.300Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| render cached css-prop component | 2418 | 2505 | 3.2% | 4.9% | 0.9% | 1.5% | unestablished at this precision |
| render css prop with a fresh request cache | 2972 | 3383 | 14% | 14% | 13% | 1.2% | higher time in every pair, beyond control spread |
| render Global with a fresh request cache | 2004 | 2064 | 4.5% | 4.5% | 4.5% | 2.2% | unestablished at this precision |
| render ClassNames composition | 3290 | 3561 | 8.3% | 8.3% | 8.7% | 1.7% | higher time in every pair, beyond control spread |
| render nested theme providers | 1692 | 1679 | -0.8% | 0.4% | -1.8% | 2.9% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T11:09:26.919Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| render cached css-prop component | 1752 | 1779 | 2.2% | 0.9% | 2.5% | 5.1% | unestablished at this precision |
| render css prop with a fresh request cache | 2426 | 2707 | 9.9% | 11.2% | 7.6% | 1.8% | higher time in every pair, beyond control spread |
| render Global with a fresh request cache | 1836 | 1767 | -3% | 2.7% | -8.3% | 4.6% | unestablished at this precision |
| render ClassNames composition | 2872 | 2931 | -0.2% | -0.7% | 193.3% | 1.5% | unestablished at this precision |
| render nested theme providers | 1309 | 1416 | 11.6% | 6.3% | 50.6% | 0.5% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vemotion-react/bench/results/node-isolated.json node packages/vemotion-react/bench/compare.cjs
OUTPUT=packages/vemotion-react/bench/results/bun-isolated.json bun packages/vemotion-react/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vemotion-react
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
