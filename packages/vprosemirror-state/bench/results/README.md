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

Recorded 2026-11-07T08:31:35.048Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create state without plugins | 247 | 77 | -68.8% | -69% | -68.4% | 1.5% | lower time in every pair, beyond control spread |
| create state with eight plugin fields | 807 | 434 | -46.2% | -46.8% | -45.7% | 3.7% | lower time in every pair, beyond control spread |
| apply metadata with eight plugin fields | 430 | 247 | -42.6% | -41.9% | -43.2% | 1.3% | lower time in every pair, beyond control spread |
| type into a text selection | 1726 | 1295 | -23.9% | -33.3% | -16.6% | 5.8% | lower time in every pair, beyond control spread |
| replace a marked selection | 2169 | 1754 | -23.8% | -19.1% | -33.7% | 6.9% | lower time in every pair, beyond control spread |
| append a plugin transaction | 3703 | 3408 | -9.9% | 3.1% | -22.8% | 4.9% | unestablished at this precision |
| serialize and restore plugin state | 2343 | 1632 | -28.2% | -52.1% | -18.8% | 2.8% | lower time in every pair, beyond control spread |
| reconfigure retained plugin fields | 482 | 277 | -41.8% | -42.8% | -41.3% | 0.9% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-07T08:32:08.166Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create state without plugins | 128 | 89 | -30.6% | -29.5% | -30.6% | 3.7% | lower time in every pair, beyond control spread |
| create state with eight plugin fields | 654 | 240 | -63% | -65.6% | -61.2% | 5% | lower time in every pair, beyond control spread |
| apply metadata with eight plugin fields | 331 | 184 | -44.2% | -47.6% | -13.5% | 0.2% | unestablished at this precision |
| type into a text selection | 951 | 961 | -1.9% | -2.9% | 0.4% | 12.7% | unestablished at this precision |
| replace a marked selection | 1302 | 1150 | -9.8% | -16.1% | -6.6% | 2.3% | lower time in every pair, beyond control spread |
| append a plugin transaction | 2332 | 2254 | -4.3% | -5.8% | -1.2% | 3.7% | unestablished at this precision |
| serialize and restore plugin state | 968 | 739 | -24.4% | -29.5% | -16.4% | 10.8% | unestablished at this precision |
| reconfigure retained plugin fields | 333 | 120 | -64% | -63.4% | -64.2% | 6.7% | lower time in every pair, beyond control spread |

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
