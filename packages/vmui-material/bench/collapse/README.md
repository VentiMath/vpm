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

Recorded 2026-11-17T06:45:40.434Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 preview Collapse SSR | 25099 | 20658 | -18.7% | -18.7% | -17.8% | 5.6% | lower time in every pair, beyond control spread |
| Material9 navigation Collapse SSR | 29164 | 24182 | -16.5% | -16.5% | -16.1% | 1.3% | lower time in every pair, beyond control spread |
| Material9 closed Collapse SSR | 22624 | 17210 | -23.9% | -48.3% | -23.2% | 5.2% | lower time in every pair, beyond control spread |
| App7 preview Collapse SSR | 22650 | 19070 | -17.2% | -9.1% | -19.6% | 5.1% | unestablished at this precision |
| App7 navigation Collapse SSR | 30844 | 23681 | -23.5% | -23.6% | -22.3% | 2.7% | lower time in every pair, beyond control spread |
| App7 closed Collapse SSR | 19841 | 17426 | -12.4% | -11.5% | -13.9% | 7.8% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-17T06:46:06.345Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 preview Collapse SSR | 18594 | 14067 | -24.4% | -19.6% | -27.2% | 2.9% | lower time in every pair, beyond control spread |
| Material9 navigation Collapse SSR | 21568 | 18405 | -16.1% | -11.5% | -16.6% | 2.1% | lower time in every pair, beyond control spread |
| Material9 closed Collapse SSR | 18422 | 14300 | -21.8% | -20.3% | -22% | 1.9% | lower time in every pair, beyond control spread |
| App7 preview Collapse SSR | 17237 | 13919 | -19% | -17.1% | -19% | 10.7% | lower time in every pair, beyond control spread |
| App7 navigation Collapse SSR | 23697 | 18602 | -21.6% | -21.1% | -21.6% | 4% | lower time in every pair, beyond control spread |
| App7 closed Collapse SSR | 16456 | 13984 | -14.8% | -13.4% | -15.9% | 4.7% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/collapse.cjs:

```sh
OUTPUT=packages/vmui-material/bench/collapse/node-isolated.json node packages/vmui-material/bench/collapse.cjs
OUTPUT=packages/vmui-material/bench/collapse/bun-isolated.json bun packages/vmui-material/bench/collapse.cjs
node scripts/render-bench-report.cjs packages/vmui-material collapse collapse.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
