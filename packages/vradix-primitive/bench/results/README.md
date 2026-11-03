# vradix-primitive measurements

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

Recorded 2026-11-03T02:44:49.079Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| compose two handlers | 194 | 12 | -94.2% | -93.1% | -94.2% | 1.4% | lower time in every pair, beyond control spread |
| two-handler dispatch | 5 | 5 | 0.8% | 21% | -15.6% | 20.8% | unestablished at this precision |
| prevented event | 9 | 9 | 4.5% | 15.3% | -5.2% | 10.3% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-03T02:46:25.733Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| compose two handlers | 85 | 18 | -79% | -79.3% | -79% | 52.3% | lower time in every pair, beyond control spread |
| two-handler dispatch | 2 | 2 | -1.1% | -0.6% | -1.3% | 54.7% | unestablished at this precision |
| prevented event | 4 | 4 | -3.9% | 1.2% | -4.4% | 44.8% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vradix-primitive/bench/results/node-isolated.json node packages/vradix-primitive/bench/compare.cjs
OUTPUT=packages/vradix-primitive/bench/results/bun-isolated.json bun packages/vradix-primitive/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-primitive results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
