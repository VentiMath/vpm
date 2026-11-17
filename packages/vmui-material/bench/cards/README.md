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

Recorded 2026-11-17T02:43:42.611Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 exam Card SSR | 179912 | 128912 | -28.4% | -25.2% | -30.7% | 9.4% | lower time in every pair, beyond control spread |
| Material9 signup Card SSR | 175348 | 120476 | -30.6% | -30.6% | -30% | 11.5% | lower time in every pair, beyond control spread |
| Material9 practice Card SSR | 174721 | 125067 | -29.6% | -19.4% | -29.6% | 2.3% | lower time in every pair, beyond control spread |
| App7 exam Card SSR | 153347 | 120004 | -22.1% | -25% | -20.8% | 11.7% | lower time in every pair, beyond control spread |
| App7 signup Card SSR | 152389 | 117031 | -23.4% | -24% | -21.6% | 2.7% | lower time in every pair, beyond control spread |
| App7 practice Card SSR | 158493 | 120726 | -23.1% | -28.6% | -21.6% | 4.7% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-17T02:44:09.220Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 exam Card SSR | 97087 | 66148 | -32.8% | -34.4% | -32.8% | 2.4% | lower time in every pair, beyond control spread |
| Material9 signup Card SSR | 95134 | 62351 | -34.9% | -33.4% | -35.4% | 9% | lower time in every pair, beyond control spread |
| Material9 practice Card SSR | 97460 | 64269 | -34% | -34.4% | -32.8% | 8.5% | lower time in every pair, beyond control spread |
| App7 exam Card SSR | 100121 | 58116 | -41.6% | -41.6% | -41.7% | 6.5% | lower time in every pair, beyond control spread |
| App7 signup Card SSR | 97933 | 60865 | -38.6% | -38.5% | -38.6% | 4.5% | lower time in every pair, beyond control spread |
| App7 practice Card SSR | 97930 | 63365 | -35.4% | -34.3% | -37% | 5.6% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/cards.cjs:

```sh
OUTPUT=packages/vmui-material/bench/cards/node-isolated.json node packages/vmui-material/bench/cards.cjs
OUTPUT=packages/vmui-material/bench/cards/bun-isolated.json bun packages/vmui-material/bench/cards.cjs
node scripts/render-bench-report.cjs packages/vmui-material cards cards.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
