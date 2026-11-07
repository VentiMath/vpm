# vprosemirror-keymap measurements

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

Recorded 2026-11-07T07:45:16.508Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| compile eight shortcut bindings | 1209 | 770 | -36.3% | -34.4% | -37.9% | 4.1% | lower time in every pair, beyond control spread |
| compile 48 function-key bindings | 8842 | 7045 | -21.1% | -19.3% | -21.8% | 1.2% | lower time in every pair, beyond control spread |
| create an eight-binding plugin | 1321 | 1035 | -21.3% | -21.1% | -22.8% | 2.1% | lower time in every pair, beyond control spread |
| dispatch unmodified keys | 24 | 22 | -7.4% | -6.6% | -7.5% | 1.2% | lower time in every pair, beyond control spread |
| dispatch modifier shortcuts | 70 | 30 | -57.4% | -56.1% | -57.9% | 3% | lower time in every pair, beyond control spread |
| dispatch shifted literal characters | 92 | 27 | -70.7% | -70.4% | -70.7% | 1.5% | lower time in every pair, beyond control spread |
| dispatch non-US modifier fallback | 146 | 38 | -74.4% | -74% | -74.9% | 3.1% | lower time in every pair, beyond control spread |
| leave Windows AltGraph input unhandled | 67 | 23 | -65.6% | -65.5% | -66.5% | 0.4% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-07T07:45:55.826Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| compile eight shortcut bindings | 411 | 454 | 10.4% | 10.9% | 9.5% | 2.7% | higher time in every pair, beyond control spread |
| compile 48 function-key bindings | 3308 | 4251 | 29.4% | -18.2% | 29.6% | 7.2% | unestablished at this precision |
| create an eight-binding plugin | 500 | 627 | 26.4% | 22.4% | 27.5% | 3% | higher time in every pair, beyond control spread |
| dispatch unmodified keys | 41 | 12 | -71.8% | -68.4% | -74.6% | 0.6% | lower time in every pair, beyond control spread |
| dispatch modifier shortcuts | 83 | 13 | -84% | -84.1% | -83.5% | 1.3% | lower time in every pair, beyond control spread |
| dispatch shifted literal characters | 113 | 14 | -87.9% | -88% | -87.8% | 1% | lower time in every pair, beyond control spread |
| dispatch non-US modifier fallback | 133 | 17 | -87% | -87% | -87.1% | 0.9% | lower time in every pair, beyond control spread |
| leave Windows AltGraph input unhandled | 100 | 14 | -86.4% | -86.5% | -86.4% | 1.2% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vprosemirror-keymap/bench/results/node-isolated.json node packages/vprosemirror-keymap/bench/compare.cjs
OUTPUT=packages/vprosemirror-keymap/bench/results/bun-isolated.json bun packages/vprosemirror-keymap/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vprosemirror-keymap results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
