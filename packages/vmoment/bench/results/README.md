# vmoment measurements

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

Recorded 2026-11-13T07:42:30.147Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| parse local countdown end date | 1953 | 575 | -70.6% | -71.2% | -70.1% | 1% | lower time in every pair, beyond control spread |
| create default fifteen-day deadline | 666 | 274 | -58.8% | -58.4% | -58.8% | 4.3% | lower time in every pair, beyond control spread |
| FuseCountdown tick and fields | 1179 | 325 | -72.4% | -71.9% | -72.4% | 3.8% | lower time in every pair, beyond control spread |
| duration construction and fields | 242 | 97 | -59.6% | -57.4% | -60.7% | 2.1% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-13T07:42:52.587Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| parse local countdown end date | 1197 | 300 | -74.6% | -74.6% | -74.8% | 18.4% | lower time in every pair, beyond control spread |
| create default fifteen-day deadline | 333 | 40 | -87.8% | -88.1% | -87.5% | 17.5% | lower time in every pair, beyond control spread |
| FuseCountdown tick and fields | 632 | 186 | -70.6% | -70.6% | -71% | 52.5% | lower time in every pair, beyond control spread |
| duration construction and fields | 133 | 14 | -89.6% | -89.9% | -89.3% | 276.8% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/run.cjs:

```sh
OUTPUT=packages/vmoment/bench/results/node-isolated.json node packages/vmoment/bench/run.cjs
OUTPUT=packages/vmoment/bench/results/bun-isolated.json bun packages/vmoment/bench/run.cjs
node scripts/render-bench-report.cjs packages/vmoment results run.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
