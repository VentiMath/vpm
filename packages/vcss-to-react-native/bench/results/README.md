# vcss-to-react-native measurements

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

Recorded 2026-11-17T23:31:14.255Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| simple declarations | 1606 | 1418 | -10.9% | -22.7% | 50.6% | 77% | unestablished at this precision |
| box and border shorthands | 2538 | 1846 | -18.7% | 61.4% | -30% | 51.9% | unestablished at this precision |
| native component style | 4403 | 6345 | 41.6% | 40.1% | 67.2% | 35.7% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-17T23:31:49.929Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| simple declarations | 796 | 313 | -57.8% | -69.6% | -55.2% | 38.8% | lower time in every pair, beyond control spread |
| box and border shorthands | 1988 | 2745 | -16.6% | 42% | -35% | 24.6% | unestablished at this precision |
| native component style | 4072 | 6160 | 39% | 28.4% | 19548.9% | 36.5% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vcss-to-react-native/bench/results/node-isolated.json node packages/vcss-to-react-native/bench/compare.cjs
OUTPUT=packages/vcss-to-react-native/bench/results/bun-isolated.json bun packages/vcss-to-react-native/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vcss-to-react-native results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
