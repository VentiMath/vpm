# vfirebase-admin measurements

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

Recorded 2026-11-03T12:30:31.975Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Auth / construct application service | 6026 | 2315 | -61.8% | -61.8% | -61.7% | 0.1% | lower time in every pair, beyond control spread |
| Auth / validate update disabled | 44 | 32 | -25.8% | -24.8% | -27.1% | 5.8% | lower time in every pair, beyond control spread |
| Auth / validate profile and linked provider | 538 | 814 | 51.4% | 52.5% | 28.2% | 1.9% | higher time in every pair, beyond control spread |
| App Check / construct verifier service | 712 | 1623 | 125.8% | 125.8% | 115% | 1.9% | higher time in every pair, beyond control spread |
| App Check / verify real signature with cached key | 46777 | 27078 | -42.1% | -42.4% | -42.1% | 1.3% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-03T12:30:53.951Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Auth / construct application service | 3544 | 1797 | -48.9% | -49.6% | -48.3% | 6.7% | lower time in every pair, beyond control spread |
| Auth / validate update disabled | 47 | 11 | -75.4% | -75.1% | -75.4% | 0.1% | lower time in every pair, beyond control spread |
| Auth / validate profile and linked provider | 426 | 562 | 31.7% | 31.4% | 32.4% | 1.5% | higher time in every pair, beyond control spread |
| App Check / construct verifier service | 541 | 1180 | 116.3% | 116.3% | 119.4% | 1.7% | higher time in every pair, beyond control spread |
| App Check / verify real signature with cached key | 26221 | 20125 | -23.2% | -21.7% | -24.5% | 1.2% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/completion.cjs:

```sh
OUTPUT=packages/vfirebase-admin/bench/completion-results/node-isolated.json node packages/vfirebase-admin/bench/completion.cjs
OUTPUT=packages/vfirebase-admin/bench/completion-results/bun-isolated.json bun packages/vfirebase-admin/bench/completion.cjs
node scripts/render-bench-report.cjs packages/vfirebase-admin completion-results completion.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
