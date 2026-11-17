# vidb measurements

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

Recorded 2026-11-17T10:30:50.521Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| cached database wrap | 10 | 9 | -11.3% | -5.7% | -14.9% | 5.3% | unestablished at this precision |
| stable store method lookup | 47 | 44 | -4.2% | -6.4% | -3.9% | 7% | unestablished at this precision |
| record read via database shortcut | 117525 | 122273 | 4.7% | -8.2% | 17.7% | 9.2% | unestablished at this precision |
| record write and transaction commit | 96921 | 95895 | 0.6% | -6.5% | 6.5% | 5.7% | unestablished at this precision |
| five-record cursor walk | 147597 | 160251 | 8.2% | 8.2% | 6.1% | 6.1% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-17T10:31:38.693Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| cached database wrap | 5 | 5 | -4.8% | -7.3% | -3.9% | 1.1% | lower time in every pair, beyond control spread |
| stable store method lookup | 15 | 11 | -26.9% | -28.5% | -25.5% | 2.5% | lower time in every pair, beyond control spread |
| record read via database shortcut | 73181 | 72071 | -1.5% | -8.2% | 4.2% | 2.4% | unestablished at this precision |
| record write and transaction commit | 81411 | 80915 | 0.5% | -14% | 15.3% | 21.5% | unestablished at this precision |
| five-record cursor walk | 77463 | 77286 | -1% | 6.7% | -1% | 2.1% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vidb/bench/results/node-isolated.json node packages/vidb/bench/compare.cjs
OUTPUT=packages/vidb/bench/results/bun-isolated.json bun packages/vidb/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vidb results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
