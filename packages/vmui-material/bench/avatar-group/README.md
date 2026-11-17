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

Recorded 2026-11-17T04:31:13.544Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 community AvatarGroup SSR | 216367 | 154466 | -28.6% | -25.4% | -32.1% | 17.4% | lower time in every pair, beyond control spread |
| Material9 surplus AvatarGroup SSR | 206542 | 139236 | -32.6% | -32.6% | -35.2% | 3.9% | lower time in every pair, beyond control spread |
| App7 community AvatarGroup SSR | 194910 | 143587 | -27.4% | -32.6% | -21.6% | 13.8% | lower time in every pair, beyond control spread |
| App7 surplus AvatarGroup SSR | 194573 | 133074 | -31.3% | -35.2% | -26.8% | 3.5% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-17T04:31:31.940Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 community AvatarGroup SSR | 124254 | 82023 | -36.5% | -39% | -32.6% | 2.2% | lower time in every pair, beyond control spread |
| Material9 surplus AvatarGroup SSR | 117442 | 75573 | -36.9% | -33.8% | -38.1% | 4.3% | lower time in every pair, beyond control spread |
| App7 community AvatarGroup SSR | 122767 | 76082 | -39.2% | -37.8% | -39.2% | 8.7% | lower time in every pair, beyond control spread |
| App7 surplus AvatarGroup SSR | 118213 | 69328 | -41.1% | -42.7% | -41.1% | 4.3% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/avatar-group.cjs:

```sh
OUTPUT=packages/vmui-material/bench/avatar-group/node-isolated.json node packages/vmui-material/bench/avatar-group.cjs
OUTPUT=packages/vmui-material/bench/avatar-group/bun-isolated.json bun packages/vmui-material/bench/avatar-group.cjs
node scripts/render-bench-report.cjs packages/vmui-material avatar-group avatar-group.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
