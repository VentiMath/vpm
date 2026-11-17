# vcss-color-keywords measurements

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

Recorded 2026-11-17T18:27:39.697Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| mixed caller color lookups | 8 | 8 | 5.4% | 83.7% | 1.5% | 11.3% | unestablished at this precision |
| own color membership | 12 | 12 | 3.3% | 58.7% | -5.2% | 15.8% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-17T18:27:45.266Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| mixed caller color lookups | 3 | 3 | 0.7% | -4.1% | 0.7% | 1.5% | unestablished at this precision |
| own color membership | 5 | 5 | 0.2% | -0.2% | 0.6% | 0.6% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vcss-color-keywords/bench/results/node-isolated.json node packages/vcss-color-keywords/bench/compare.cjs
OUTPUT=packages/vcss-color-keywords/bench/results/bun-isolated.json bun packages/vcss-color-keywords/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vcss-color-keywords results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
