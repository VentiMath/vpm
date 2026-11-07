# vprosemirror-state measurements

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

Recorded 2026-11-07T06:59:31.976Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create state without plugins | 249 | 78 | -68.4% | -68.4% | -68.5% | 3.4% | lower time in every pair, beyond control spread |
| create state with eight plugin fields | 807 | 442 | -45.2% | -45.4% | -43.3% | 2% | lower time in every pair, beyond control spread |
| apply metadata with eight plugin fields | 430 | 248 | -42.2% | -43.1% | -42.1% | 2.8% | lower time in every pair, beyond control spread |
| type into a text selection | 1789 | 1557 | -15.8% | -20.8% | -15.2% | 3.4% | lower time in every pair, beyond control spread |
| replace a marked selection | 2310 | 1855 | -26.4% | -15.5% | -28% | 4% | unestablished at this precision |
| append a plugin transaction | 3794 | 2663 | -25.7% | -32.9% | -20.3% | 62.2% | unestablished at this precision |
| serialize and restore plugin state | 1801 | 1669 | -17.8% | -4.2% | -17.8% | 11.5% | unestablished at this precision |
| reconfigure retained plugin fields | 477 | 278 | -41.5% | -40.9% | -42.2% | 0.6% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-07T07:00:05.478Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create state without plugins | 129 | 90 | -31.1% | -29.9% | -33.4% | 2.8% | lower time in every pair, beyond control spread |
| create state with eight plugin fields | 699 | 240 | -65.5% | -65.5% | -65.6% | 9% | lower time in every pair, beyond control spread |
| apply metadata with eight plugin fields | 338 | 181 | -46.5% | -48.1% | -44.6% | 2.3% | lower time in every pair, beyond control spread |
| type into a text selection | 1000 | 1005 | 2.9% | 0.6% | 5.7% | 4.7% | unestablished at this precision |
| replace a marked selection | 1269 | 1146 | -9.7% | -16.3% | 0.1% | 2.1% | unestablished at this precision |
| append a plugin transaction | 2288 | 2280 | -0.8% | -7.6% | 1.7% | 5.1% | unestablished at this precision |
| serialize and restore plugin state | 970 | 724 | -25.4% | -26.8% | -25.4% | 6.2% | lower time in every pair, beyond control spread |
| reconfigure retained plugin fields | 337 | 131 | -62.3% | -60.9% | -62.3% | 4.6% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vprosemirror-state/bench/results/node-isolated.json node packages/vprosemirror-state/bench/compare.cjs
OUTPUT=packages/vprosemirror-state/bench/results/bun-isolated.json bun packages/vprosemirror-state/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vprosemirror-state results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
