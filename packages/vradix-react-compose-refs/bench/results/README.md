# vradix-react-compose-refs measurements

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

Recorded 2026-11-04T15:24:22.604Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| compose two refs | 10 | 11 | 2.8% | 16.3% | -11.6% | 18.3% | unestablished at this precision |
| attach object and plain callback | 14 | 9 | -35.6% | -8.7% | -48.2% | 2.5% | unestablished at this precision |
| mixed refs / attach and cleanup | 62 | 44 | -29.2% | -25.9% | -42.5% | 30.8% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-04T15:24:34.938Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| compose two refs | 16 | 17 | 7.8% | 10.7% | 3.3% | 34.5% | unestablished at this precision |
| attach object and plain callback | 29 | 9 | -67.5% | -67.9% | -66.7% | 6.7% | lower time in every pair, beyond control spread |
| mixed refs / attach and cleanup | 64 | 37 | -42% | -53.5% | -41.4% | 1.6% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vradix-react-compose-refs/bench/results/node-isolated.json node packages/vradix-react-compose-refs/bench/compare.cjs
OUTPUT=packages/vradix-react-compose-refs/bench/results/bun-isolated.json bun packages/vradix-react-compose-refs/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-compose-refs results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
