# vradix-react-focus-scope measurements

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

Recorded 2026-11-05T21:09:41.605Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR 8 scopes | 24630 | 15848 | -35.7% | -36% | -35.7% | 4.5% | lower time in every pair, beyond control spread |
| unchanged 8 scopes | 38015 | 27997 | -25.8% | -26.4% | -25.8% | 1.1% | lower time in every pair, beyond control spread |
| Tab loop 32 controls | 120168 | 128006 | 7.2% | 7.2% | 7.7% | 4.2% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-05T21:09:57.118Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR 8 scopes | 12280 | 10656 | -12.4% | -11.4% | -14.3% | 2.4% | lower time in every pair, beyond control spread |
| unchanged 8 scopes | 24803 | 21099 | -14.5% | -15.7% | -13.9% | 2.2% | lower time in every pair, beyond control spread |
| Tab loop 32 controls | 44676 | 48200 | 6.9% | -6% | 9.7% | 6.6% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vradix-react-focus-scope/bench/results/node-isolated.json node packages/vradix-react-focus-scope/bench/compare.cjs
OUTPUT=packages/vradix-react-focus-scope/bench/results/bun-isolated.json bun packages/vradix-react-focus-scope/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-focus-scope results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
