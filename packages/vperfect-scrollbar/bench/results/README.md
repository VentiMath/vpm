# vperfect-scrollbar measurements

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

These cases use jsdom 27.3.0 with fixed client/scroll dimensions and each
implementation’s stylesheet. This measures JavaScript and DOM API work, including
style access. It does not measure native browser layout, paint or frame rate.
Geometry and real input behavior are verified separately in Chrome.

## Node 24.22.1

Recorded 2026-11-11T18:40:30.536Z on Apple M1 Pro, darwin/arm64.

[Raw samples, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| construct and destroy desktop scrollbar | 3038408 | 957032 | -68.5% | 5.1% | lower time in every pair, beyond control spread |
| unchanged geometry update | 1714156 | 821536 | -51.1% | 4.6% | lower time in every pair, beyond control spread |
| native scroll event and thumb update | 42408 | 35664 | -15.5% | 6.2% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-11T18:40:58.524Z on Apple M1 Pro, darwin/arm64.

[Raw samples, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| construct and destroy desktop scrollbar | 1859369 | 597740 | -67.3% | 26.3% | lower time in every pair, beyond control spread |
| unchanged geometry update | 1122796 | 532255 | -52.3% | 23.6% | unestablished at this precision |
| native scroll event and thumb update | 26430 | 18041 | -27.4% | 12.8% | lower time in every pair, beyond control spread |

Construction/destruction takes 68.5% less time on Node and 67.3% less on Bun.
Native scroll handling takes 15.5% less on Node and 27.4% less on Bun. Explicit
unchanged geometry refresh is 51.1% lower on Node; Bun's direction is unestablished
because a process pair overlaps its control spread. The desktop implementation
omits unused touch/legacy-browser machinery, keeps native positions authoritative
and avoids redundant style writes. No production application speedup is claimed.

## Reproduce

```sh
OUTPUT=packages/vperfect-scrollbar/bench/results/node-isolated.json node packages/vperfect-scrollbar/bench/run.cjs
OUTPUT=packages/vperfect-scrollbar/bench/results/bun-isolated.json bun packages/vperfect-scrollbar/bench/run.cjs
```
