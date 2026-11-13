# vprosemirror-view measurements

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

Recorded 2026-11-13T07:52:24.914Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create one selection decoration | 2631 | 286 | -89% | -89.5% | -88% | 20.5% | lower time in every pair, beyond control spread |
| index 100 inline decorations | 32635 | 24009 | -26.4% | -26.4% | -26.3% | 6.9% | lower time in every pair, beyond control spread |
| find in a narrow range | 280 | 46 | -83.5% | -84.3% | -82.4% | 4% | lower time in every pair, beyond control spread |
| map 100 decorations through one insertion | 796 | 7439 | 834.5% | 834.5% | 844.1% | 6.1% | higher time in every pair, beyond control spread |
| add one widget to 100 decorations | 2435 | 1220 | -49.8% | -62.4% | -49.8% | 30.6% | lower time in every pair, beyond control spread |
| remove one of 100 decorations | 661 | 164 | -75.3% | -75.3% | -76.5% | 1% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-13T07:52:54.335Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create one selection decoration | 1366 | 302 | -78.3% | -77.4% | -78.4% | 3% | lower time in every pair, beyond control spread |
| index 100 inline decorations | 29498 | 31849 | 6% | 7.6% | 6% | 5.8% | unestablished at this precision |
| find in a narrow range | 242 | 76 | -68.3% | -68.8% | -68.3% | 7% | lower time in every pair, beyond control spread |
| map 100 decorations through one insertion | 1090 | 9454 | 761.9% | 1008.4% | 761.9% | 20.3% | higher time in every pair, beyond control spread |
| add one widget to 100 decorations | 1897 | 1715 | -11% | -14.1% | -0.2% | 17% | unestablished at this precision |
| remove one of 100 decorations | 835 | 430 | -47.7% | -48.4% | -46.9% | 4.8% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vprosemirror-view/bench/results/node-isolated.json node packages/vprosemirror-view/bench/compare.cjs
OUTPUT=packages/vprosemirror-view/bench/results/bun-isolated.json bun packages/vprosemirror-view/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vprosemirror-view results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
