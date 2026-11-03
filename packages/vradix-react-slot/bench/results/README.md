# vradix-react-slot measurements

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

Recorded 2026-11-03T05:23:24.723Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR / ordinary button | 3733 | 3229 | -13.5% | -13.4% | -13.5% | 7.8% | lower time in every pair, beyond control spread |
| SSR / child with 64 data props | 59279 | 47364 | -19.8% | -17.7% | -21.3% | 43.2% | unestablished at this precision |
| SSR / Slottable render function and siblings | 8233 | 7646 | -7.7% | 1.4% | -11.1% | 53.6% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-03T05:23:37.696Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR / ordinary button | 2435 | 2065 | -15% | -16.6% | -12.4% | 2.5% | lower time in every pair, beyond control spread |
| SSR / child with 64 data props | 14216 | 12289 | -11.5% | -14.6% | -11.5% | 3.8% | lower time in every pair, beyond control spread |
| SSR / Slottable render function and siblings | 4118 | 4320 | 4.3% | 5.2% | 4.3% | 11% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vradix-react-slot/bench/results/node-isolated.json node packages/vradix-react-slot/bench/compare.cjs
OUTPUT=packages/vradix-react-slot/bench/results/bun-isolated.json bun packages/vradix-react-slot/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-slot results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
