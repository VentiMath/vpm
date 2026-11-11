# vgoober measurements

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

Recorded 2026-11-11T12:53:47.595Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| repeated flat object styles | 236 | 739 | 213.8% | 217.5% | 213.8% | 3.4% | higher time in every pair, beyond control spread |
| repeated nested responsive styles | 390 | 1144 | 200.8% | 196.7% | 200.8% | 3.3% | higher time in every pair, beyond control spread |
| changing style and SSR extraction | 243 | 1889 | 676.1% | 649.8% | 685.3% | 8.1% | higher time in every pair, beyond control spread |
| 20 Notistack definitions and SSR extraction | 9762 | 20254 | 106.7% | 102.4% | 110.3% | 4.4% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-11T12:54:03.774Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| repeated flat object styles | 196 | 204 | 4.2% | 4.3% | 2.6% | 3.8% | unestablished at this precision |
| repeated nested responsive styles | 332 | 303 | -8.6% | -10.7% | -7.8% | 7.1% | lower time in every pair, beyond control spread |
| changing style and SSR extraction | 284 | 896 | 211.4% | 208.2% | 231.6% | 2.7% | higher time in every pair, beyond control spread |
| 20 Notistack definitions and SSR extraction | 9007 | 11086 | 23.1% | 24.8% | 21.7% | 11.6% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/run.cjs:

```sh
OUTPUT=packages/vgoober/bench/results/node-isolated.json node packages/vgoober/bench/run.cjs
OUTPUT=packages/vgoober/bench/results/bun-isolated.json bun packages/vgoober/bench/run.cjs
node scripts/render-bench-report.cjs packages/vgoober results run.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
