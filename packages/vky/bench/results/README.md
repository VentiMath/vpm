# vky measurements

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

Recorded 2026-11-09T10:02:20.445Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create client | 1656 | 708 | -57.2% | -58.4% | -56.3% | 2% | lower time in every pair, beyond control spread |
| GET JSON | 41747 | 27751 | -29.7% | -36% | -27.1% | 8.5% | lower time in every pair, beyond control spread |
| POST JSON | 52172 | 46317 | -10.8% | -3.6% | -11% | 11% | unestablished at this precision |
| HTTP error JSON | 39091 | 36175 | -5.7% | 1.3% | -6.6% | 10.5% | unestablished at this precision |
| retry 503 | 1357263 | 57357 | -95.9% | -95.7% | -96.1% | 4.1% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-09T10:02:47.523Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create client | 1057 | 435 | -58.8% | -56.3% | -59.7% | 10.6% | lower time in every pair, beyond control spread |
| GET JSON | 15622 | 38970 | 146.1% | 141.4% | 146.1% | 3.5% | higher time in every pair, beyond control spread |
| POST JSON | 17929 | 50754 | 167.8% | 164.5% | 175.1% | 15.2% | higher time in every pair, beyond control spread |
| HTTP error JSON | 46978 | 41471 | -12% | -13.6% | -12% | 11.6% | unestablished at this precision |
| retry 503 | 1261366 | 60675 | -95.5% | -96.5% | -94.1% | 5% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vky/bench/results/node-isolated.json node packages/vky/bench/compare.cjs
OUTPUT=packages/vky/bench/results/bun-isolated.json bun packages/vky/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vky results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
