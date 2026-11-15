# vmui-material measurements

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

Recorded 2026-11-15T18:11:58.758Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 radio Radio SSR | 470238 | 419518 | -10.3% | -10.7% | -10.3% | 8.4% | unestablished at this precision |
| Material9 group Radio SSR | 1374046 | 1493601 | 8.7% | 21.4% | -0.5% | 5.2% | unestablished at this precision |
| Material9 form Radio SSR | 1557530 | 1447051 | -3.9% | 0.7% | -3.9% | 10.1% | unestablished at this precision |
| App7 radio Radio SSR | 397916 | 401235 | 1.7% | -2.3% | 110% | 2.8% | unestablished at this precision |
| App7 group Radio SSR | 1461088 | 1424933 | 0.7% | 0.7% | 10.6% | 9.4% | unestablished at this precision |
| App7 form Radio SSR | 1549055 | 1513393 | -4.5% | -1.4% | -7.4% | 4.7% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-15T18:12:28.078Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 radio Radio SSR | 309428 | 212348 | -30.7% | -28.1% | -33% | 4.4% | lower time in every pair, beyond control spread |
| Material9 group Radio SSR | 997384 | 881447 | -11.6% | -6.3% | -16.4% | 5.8% | unestablished at this precision |
| Material9 form Radio SSR | 1121439 | 926640 | -18.5% | -24.3% | -18.5% | 11.1% | lower time in every pair, beyond control spread |
| App7 radio Radio SSR | 290012 | 214284 | -26.1% | -26.1% | -26.3% | 16.1% | lower time in every pair, beyond control spread |
| App7 group Radio SSR | 1032946 | 873219 | -13.7% | -13.7% | -13.5% | 3.7% | lower time in every pair, beyond control spread |
| App7 form Radio SSR | 1043974 | 897433 | -13.1% | -9% | -17.8% | 5.9% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/radio.cjs:

```sh
OUTPUT=packages/vmui-material/bench/radio/node-isolated.json node packages/vmui-material/bench/radio.cjs
OUTPUT=packages/vmui-material/bench/radio/bun-isolated.json bun packages/vmui-material/bench/radio.cjs
node scripts/render-bench-report.cjs packages/vmui-material radio radio.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
