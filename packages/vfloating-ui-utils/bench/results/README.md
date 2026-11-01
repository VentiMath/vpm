# vfloating-ui-utils measurements

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

Recorded 2026-11-01T20:48:25.829Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| side / aligned | 40 | 29 | -27.1% | 9% | -40.4% | 7.4% | unestablished at this precision |
| alignment / aligned | 42 | 44 | 4.3% | 17.9% | -18.1% | 18.4% | unestablished at this precision |
| alignment sides / RTL | 88 | 52 | -40.6% | -40.2% | -40.6% | 13.7% | lower time in every pair, beyond control spread |
| expanded placements | 190 | 230 | 20.1% | 47.3% | 17.8% | 2.4% | higher time in every pair, beyond control spread |
| opposite axis / unaligned | 81 | 32 | -61.9% | -48.4% | -62% | 0.6% | lower time in every pair, beyond control spread |
| opposite axis / aligned RTL | 353 | 265 | -23.6% | -23.9% | -23.6% | 51.9% | unestablished at this precision |
| padding / object | 19 | 18 | -4.3% | -4.3% | 0% | 35.7% | unestablished at this precision |
| client rect | 22 | 18 | -9.3% | -32.5% | 54.8% | 12.5% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T20:48:57.295Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| side / aligned | 22 | 22 | 2.1% | 4.5% | 1.7% | 4.2% | unestablished at this precision |
| alignment / aligned | 22 | 30 | 33.6% | 33.6% | 47.8% | 10.4% | higher time in every pair, beyond control spread |
| alignment sides / RTL | 66 | 62 | -7.6% | -4.7% | -8% | 8.2% | unestablished at this precision |
| expanded placements | 159 | 193 | 24% | 24% | 20.4% | 4.4% | higher time in every pair, beyond control spread |
| opposite axis / unaligned | 44 | 37 | -17.7% | -18.1% | -15.7% | 17.1% | unestablished at this precision |
| opposite axis / aligned RTL | 255 | 279 | 8.8% | 3% | 19.2% | 5.4% | unestablished at this precision |
| padding / object | 29 | 29 | 0% | -5.6% | 0.2% | 5.3% | unestablished at this precision |
| client rect | 32 | 32 | 0.6% | -0.1% | 3.1% | 5.8% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vfloating-ui-utils/bench/results/node-isolated.json node packages/vfloating-ui-utils/bench/compare.cjs
OUTPUT=packages/vfloating-ui-utils/bench/results/bun-isolated.json bun packages/vfloating-ui-utils/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vfloating-ui-utils
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
