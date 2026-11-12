# vdate-fns measurements

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

Recorded 2026-11-12T21:28:56.919Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| format calendar timestamp | 1841 | 507 | -72.6% | -72.1% | -73.3% | 9.3% | lower time in every pair, beyond control spread |
| parse picker date and time | 5110 | 2073 | -58% | -58% | -57.2% | 11.7% | lower time in every pair, beyond control spread |
| parse calendar ISO instant | 1096 | 718 | -32.6% | -32.6% | -41.1% | 8.7% | lower time in every pair, beyond control spread |
| month-end calendar arithmetic | 294 | 295 | 0.5% | 3% | -8.1% | 6.6% | unestablished at this precision |
| relative notification time | 996 | 592 | -41.7% | -38.5% | -46.2% | 66.8% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-12T21:29:41.104Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| format calendar timestamp | 1492 | 282 | -81.3% | -80.6% | -82% | 6% | lower time in every pair, beyond control spread |
| parse picker date and time | 3292 | 1454 | -55.8% | -55.8% | -53.9% | 20.7% | lower time in every pair, beyond control spread |
| parse calendar ISO instant | 609 | 605 | -0.7% | -3.3% | 7.5% | 5.9% | unestablished at this precision |
| month-end calendar arithmetic | 73 | 72 | -3.4% | -6.4% | 3.9% | 4.9% | unestablished at this precision |
| relative notification time | 824 | 407 | -49.5% | -44.6% | -51.4% | 4.9% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/run.cjs:

```sh
OUTPUT=packages/vdate-fns/bench/results/node-isolated.json node packages/vdate-fns/bench/run.cjs
OUTPUT=packages/vdate-fns/bench/results/bun-isolated.json bun packages/vdate-fns/bench/run.cjs
node scripts/render-bench-report.cjs packages/vdate-fns results run.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
