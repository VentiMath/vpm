# vradix-react-use-is-hydrated measurements

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

Recorded 2026-11-04T16:54:56.104Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR 128 hooks | 74356 | 68999 | -6.9% | 5.1% | -14.6% | 2.9% | unestablished at this precision |
| update 128 hooks | 140285 | 102062 | -29.6% | -34.3% | -26.2% | 18.6% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-04T16:55:15.240Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR 128 hooks | 46800 | 48622 | -6.7% | 5.2% | -9.8% | 19.1% | unestablished at this precision |
| update 128 hooks | 104196 | 66649 | -37.1% | -37.2% | -35.7% | 22.2% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vradix-react-use-is-hydrated/bench/results/node-isolated.json node packages/vradix-react-use-is-hydrated/bench/compare.cjs
OUTPUT=packages/vradix-react-use-is-hydrated/bench/results/bun-isolated.json bun packages/vradix-react-use-is-hydrated/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-use-is-hydrated results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
