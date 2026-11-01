# vhoist-non-react-statics measurements

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

Recorded 2026-11-01T23:52:30.656Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| function wrapper / four statics | 2237 | 890 | -60.1% | -60.1% | -60.1% | 3.7% | lower time in every pair, beyond control spread |
| memo wrapper / custom symbol and static | 680 | 578 | -15.3% | -15.4% | -15.3% | 1.1% | lower time in every pair, beyond control spread |
| inheritance / eight component levels | 2615 | 2874 | 9.9% | 9.3% | 9.9% | 1.3% | higher time in every pair, beyond control spread |
| descriptor / getter, symbol and blacklist | 928 | 784 | -14% | -15.1% | -14% | 1.4% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T23:52:46.272Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| function wrapper / four statics | 1087 | 556 | -49% | -47.7% | -49.4% | 4.9% | lower time in every pair, beyond control spread |
| memo wrapper / custom symbol and static | 256 | 250 | -2.8% | -1.4% | -3.4% | 0.7% | unestablished at this precision |
| inheritance / eight component levels | 954 | 1044 | 9.4% | 4.7% | 9.4% | 2.9% | unestablished at this precision |
| descriptor / getter, symbol and blacklist | 306 | 278 | -9.5% | -10.1% | -8.5% | 1.7% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vhoist-non-react-statics/bench/results/node-isolated.json node packages/vhoist-non-react-statics/bench/compare.cjs
OUTPUT=packages/vhoist-non-react-statics/bench/results/bun-isolated.json bun packages/vhoist-non-react-statics/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vhoist-non-react-statics results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
