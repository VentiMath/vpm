# vmemoize-one measurements

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

Recorded 2026-11-02T00:54:08.101Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| four-argument cache hit | 28 | 13 | -52.1% | -47.2% | -56.2% | 13.9% | lower time in every pair, beyond control spread |
| alternating misses | 34 | 24 | -27.4% | -25.2% | -29.4% | 20.2% | lower time in every pair, beyond control spread |
| receiver changes | 35 | 23 | -32.8% | -31% | -34.3% | 1.9% | lower time in every pair, beyond control spread |
| custom comparator hits | 26 | 12 | -52.3% | -49% | -55.2% | 3.1% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-02T00:54:24.196Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| four-argument cache hit | 14 | 15 | 9.8% | 4.6% | 11.7% | 2% | unestablished at this precision |
| alternating misses | 28 | 25 | -8.3% | -8.3% | -6.3% | 1.7% | unestablished at this precision |
| receiver changes | 33 | 38 | 15.3% | 15.6% | 14.6% | 0.5% | higher time in every pair, beyond control spread |
| custom comparator hits | 20 | 29 | 44.5% | 47.3% | 42.2% | 7.2% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vmemoize-one/bench/results/node-isolated.json node packages/vmemoize-one/bench/compare.cjs
OUTPUT=packages/vmemoize-one/bench/results/bun-isolated.json bun packages/vmemoize-one/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vmemoize-one results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
