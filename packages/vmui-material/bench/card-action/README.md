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

Recorded 2026-11-17T04:07:01.612Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 article CardActionArea SSR | 230036 | 177993 | -23.5% | -19.8% | -32.8% | 6.5% | lower time in every pair, beyond control spread |
| Material9 exam CardActionArea SSR | 224912 | 173274 | -24.6% | -22.5% | -25.3% | 4.9% | lower time in every pair, beyond control spread |
| App7 article CardActionArea SSR | 201700 | 159985 | -20.2% | -15.8% | -20.2% | 3.8% | lower time in every pair, beyond control spread |
| App7 exam CardActionArea SSR | 207739 | 158817 | -23.9% | -23.9% | -21.1% | 5% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-17T04:07:34.578Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 article CardActionArea SSR | 139840 | 98879 | -31.8% | -28.2% | -31.8% | 3.6% | lower time in every pair, beyond control spread |
| Material9 exam CardActionArea SSR | 136866 | 83607 | -39.5% | -29.9% | -39.7% | 2.6% | lower time in every pair, beyond control spread |
| App7 article CardActionArea SSR | 144130 | 86477 | -37.3% | -28.5% | -37.3% | 3.2% | lower time in every pair, beyond control spread |
| App7 exam CardActionArea SSR | 141791 | 81005 | -39.6% | -39.6% | -40.3% | 2.4% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/card-action.cjs:

```sh
OUTPUT=packages/vmui-material/bench/card-action/node-isolated.json node packages/vmui-material/bench/card-action.cjs
OUTPUT=packages/vmui-material/bench/card-action/bun-isolated.json bun packages/vmui-material/bench/card-action.cjs
node scripts/render-bench-report.cjs packages/vmui-material card-action card-action.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
