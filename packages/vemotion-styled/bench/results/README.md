# vemotion-styled measurements

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

Recorded 2026-11-01T11:09:44.581Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| construct DOM styled component | 212 | 170 | -20.1% | -18.3% | -20.4% | 6.1% | lower time in every pair, beyond control spread |
| construct inherited styled component | 163 | 178 | 8.9% | 9.1% | 8.9% | 1% | higher time in every pair, beyond control spread |
| server render cached static styles | 2553 | 2500 | -2% | -1.9% | -2.3% | 1.5% | unestablished at this precision |
| server render theme and prop interpolation | 2117 | 2127 | 0.9% | 0.4% | 0.9% | 1.1% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T11:10:02.362Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| construct DOM styled component | 104 | 94 | -9.3% | -9.5% | -9.1% | 11.4% | unestablished at this precision |
| construct inherited styled component | 130 | 115 | -11.5% | -11.9% | -11.2% | 10.1% | lower time in every pair, beyond control spread |
| server render cached static styles | 1932 | 1897 | -2.6% | 1.6% | -2.6% | 21% | unestablished at this precision |
| server render theme and prop interpolation | 1804 | 1829 | 1.8% | 1.4% | 1.8% | 8.5% | unestablished at this precision |

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
