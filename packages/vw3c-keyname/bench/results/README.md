# vw3c-keyname measurements

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

Recorded 2026-11-07T07:16:45.353Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| modern letter keys | 9 | 6 | -28.7% | -23.8% | -32.5% | 8% | lower time in every pair, beyond control spread |
| modern navigation keys | 10 | 7 | -26.9% | -24.4% | -32.2% | 4.2% | lower time in every pair, beyond control spread |
| international and composition keys | 9 | 7 | -27.1% | -23.9% | -29.2% | 3.2% | lower time in every pair, beyond control spread |
| legacy key-code and shift fallback | 17 | 14 | -19.7% | -18.9% | -20.8% | 2% | lower time in every pair, beyond control spread |
| getter-backed keyboard events | 49 | 29 | -40.4% | -46.1% | -35.6% | 6.7% | lower time in every pair, beyond control spread |
| Mac Command+Shift fallback | 14 | 12 | -11.3% | -4.5% | -16.4% | 6.9% | unestablished at this precision |
| unidentified unmapped keys | 31 | 31 | -0.1% | 2.7% | -1.3% | 0.8% | unestablished at this precision |
| ProseMirror keymap shortcut dispatch | 49 | 47 | -4.5% | 5.1% | -5.1% | 11.7% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-07T07:17:20.683Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| modern letter keys | 35 | 4 | -89.8% | -89.5% | -89.8% | 1.5% | lower time in every pair, beyond control spread |
| modern navigation keys | 36 | 5 | -87.2% | -87.5% | -75.6% | 4.7% | lower time in every pair, beyond control spread |
| international and composition keys | 36 | 5 | -87.1% | -87.3% | -86.7% | 3.4% | lower time in every pair, beyond control spread |
| legacy key-code and shift fallback | 42 | 11 | -74% | -78.1% | -72.2% | 2.5% | lower time in every pair, beyond control spread |
| getter-backed keyboard events | 60 | 12 | -80.1% | -80.8% | -79.8% | 7.7% | lower time in every pair, beyond control spread |
| Mac Command+Shift fallback | 44 | 9 | -79.1% | -79.4% | -78.5% | 1.1% | lower time in every pair, beyond control spread |
| unidentified unmapped keys | 62 | 24 | -60.5% | -61.8% | -58.9% | 4.3% | lower time in every pair, beyond control spread |
| ProseMirror keymap shortcut dispatch | 74 | 35 | -52.6% | -53.5% | -52.2% | 4% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vw3c-keyname/bench/results/node-isolated.json node packages/vw3c-keyname/bench/compare.cjs
OUTPUT=packages/vw3c-keyname/bench/results/bun-isolated.json bun packages/vw3c-keyname/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vw3c-keyname results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
