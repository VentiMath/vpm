# vtabbable measurements

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

Recorded 2026-11-01T23:11:08.218Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| model / four-button focus list | 46482 | 46258 | -0.5% | 1.5% | -4.1% | 19.5% | unestablished at this precision |
| model / 120 radios, 30 groups | 6925943 | 1087158 | -84.3% | -84.5% | -84.3% | 2.9% | lower time in every pair, beyond control spread |
| model / shadow focus list | 54875 | 28453 | -47.7% | -47.5% | -47.9% | 2.1% | lower time in every pair, beyond control spread |
| model / isTabbable button | 18374 | 6263 | -65.9% | -66.2% | -65.6% | 2% | lower time in every pair, beyond control spread |
| DOM / explicit tab index | 123 | 68 | -44.5% | -44.8% | -43.8% | 3.4% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T23:11:37.264Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| model / four-button focus list | 35468 | 35466 | -1.5% | 0.5% | -3.2% | 6.9% | unestablished at this precision |
| model / 120 radios, 30 groups | 7635428 | 895701 | -88.2% | -88.4% | -88.2% | 1.9% | lower time in every pair, beyond control spread |
| model / shadow focus list | 39013 | 20604 | -46.7% | -46.8% | -46.1% | 3.1% | lower time in every pair, beyond control spread |
| model / isTabbable button | 12807 | 4504 | -64.9% | -65.8% | -63.9% | 0.3% | lower time in every pair, beyond control spread |
| DOM / explicit tab index | 150 | 68 | -54.4% | -63.3% | -54.2% | 2.5% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vtabbable/bench/results/node-isolated.json node packages/vtabbable/bench/compare.cjs
OUTPUT=packages/vtabbable/bench/results/bun-isolated.json bun packages/vtabbable/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vtabbable results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
