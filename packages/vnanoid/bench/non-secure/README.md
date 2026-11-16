# vnanoid measurements

The control is the previous VPM implementation at `a8e36cfb`. Standard harness
fields labelled “upstream” refer to that hash-verified historical source here.

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

Recorded 2026-11-16T23:08:25.650Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Previous VPM non-secure 6 | 100 | 95 | -5.5% | -4.3% | -6.4% | 1.4% | lower time in every pair, beyond control spread |
| Previous VPM non-secure 21 | 322 | 300 | -6.8% | -5.6% | -7% | 2.4% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-16T23:08:34.018Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Previous VPM non-secure 6 | 31 | 29 | -7% | -7.8% | -7% | 1.7% | lower time in every pair, beyond control spread |
| Previous VPM non-secure 21 | 116 | 108 | -6.7% | -5.8% | -8% | 3% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/non-secure.cjs:

```sh
OUTPUT=packages/vnanoid/bench/non-secure/node-isolated.json node packages/vnanoid/bench/non-secure.cjs
OUTPUT=packages/vnanoid/bench/non-secure/bun-isolated.json bun packages/vnanoid/bench/non-secure.cjs
node scripts/render-bench-report.cjs packages/vnanoid non-secure non-secure.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
