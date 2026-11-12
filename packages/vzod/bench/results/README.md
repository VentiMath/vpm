# vzod measurements

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

Recorded 2026-11-12T20:59:04.109Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| construct twenty-field form schema | 68036 | 4371 | -93.5% | -93.2% | -93.7% | 36.1% | lower time in every pair, beyond control spread |
| valid twenty-field form | 530 | 1352 | 156% | 155.4% | 157.3% | 13.6% | higher time in every pair, beyond control spread |
| invalid twenty-field form | 1896 | 1660 | -12.3% | -10% | -18.2% | 16.8% | unestablished at this precision |
| recursive presentation document | 3824 | 12531 | 230.1% | 217.2% | 241.3% | 2.5% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-12T21:00:13.320Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| construct twenty-field form schema | 36408 | 4710 | -86.9% | -87.6% | -86.6% | 8.2% | lower time in every pair, beyond control spread |
| valid twenty-field form | 582 | 1034 | 78.1% | 83.9% | 74.1% | 1.4% | higher time in every pair, beyond control spread |
| invalid twenty-field form | 1635 | 1770 | 3.8% | -29.3% | 9.5% | 11% | unestablished at this precision |
| recursive presentation document | 5299 | 12883 | 144% | 144% | 126.4% | 7.1% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/run.cjs:

```sh
OUTPUT=packages/vzod/bench/results/node-isolated.json node packages/vzod/bench/run.cjs
OUTPUT=packages/vzod/bench/results/bun-isolated.json bun packages/vzod/bench/run.cjs
node scripts/render-bench-report.cjs packages/vzod results run.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
