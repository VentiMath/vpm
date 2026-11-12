# vtsconfck measurements

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

Recorded 2026-11-12T22:52:30.334Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| JSONC alias conversion | 44343 | 36694 | -18.8% | -4.6% | -18.8% | 2.6% | unestablished at this precision |
| cached configuration read | 187 | 56 | -69.3% | -71.7% | -68.1% | 7.9% | lower time in every pair, beyond control spread |
| uncached inherited configuration | 275952 | 280070 | -2.2% | 19.5% | -3.7% | 24.4% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-12T22:53:05.517Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| JSONC alias conversion | 69012 | 24143 | -64.9% | -57.4% | -67.2% | 3.1% | lower time in every pair, beyond control spread |
| cached configuration read | 139 | 38 | -71.5% | -72% | -67.8% | 6.7% | lower time in every pair, beyond control spread |
| uncached inherited configuration | 178603 | 151501 | -19.5% | -19.5% | -15.6% | 10.3% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/run.cjs:

```sh
OUTPUT=packages/vtsconfck/bench/results/node-isolated.json node packages/vtsconfck/bench/run.cjs
OUTPUT=packages/vtsconfck/bench/results/bun-isolated.json bun packages/vtsconfck/bench/run.cjs
node scripts/render-bench-report.cjs packages/vtsconfck results run.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
