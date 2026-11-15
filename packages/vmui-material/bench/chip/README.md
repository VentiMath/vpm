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

Recorded 2026-11-15T19:58:22.529Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 status Chip SSR | 447664 | 341596 | -25% | -22.5% | -25.8% | 1.6% | lower time in every pair, beyond control spread |
| Material9 preferences Chip SSR | 664754 | 523952 | -21.2% | -17.3% | -24.4% | 4.2% | lower time in every pair, beyond control spread |
| Material9 roommates Chip SSR | 829777 | 693932 | -16.3% | -14.9% | -17.5% | 2.1% | lower time in every pair, beyond control spread |
| App7 status Chip SSR | 443099 | 313867 | -28.8% | -29.9% | -28.8% | 8.7% | lower time in every pair, beyond control spread |
| App7 preferences Chip SSR | 634068 | 505776 | -20.4% | -18.3% | -21.6% | 2.1% | lower time in every pair, beyond control spread |
| App7 roommates Chip SSR | 850999 | 682831 | -19.2% | -19.5% | -19.2% | 5.4% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-15T19:58:59.632Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 status Chip SSR | 298238 | 193926 | -35% | -34.6% | -36.1% | 1.8% | lower time in every pair, beyond control spread |
| Material9 preferences Chip SSR | 435970 | 302782 | -30% | -29.5% | -30.2% | 4.5% | lower time in every pair, beyond control spread |
| Material9 roommates Chip SSR | 568555 | 438996 | -23.4% | -22.3% | -23.4% | 5.1% | lower time in every pair, beyond control spread |
| App7 status Chip SSR | 320810 | 208585 | -34.8% | -33.9% | -34.8% | 7.4% | lower time in every pair, beyond control spread |
| App7 preferences Chip SSR | 439494 | 305753 | -30.7% | -33.4% | -28.4% | 1.5% | lower time in every pair, beyond control spread |
| App7 roommates Chip SSR | 598207 | 438069 | -27% | -30.8% | -22.8% | 2% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/chip.cjs:

```sh
OUTPUT=packages/vmui-material/bench/chip/node-isolated.json node packages/vmui-material/bench/chip.cjs
OUTPUT=packages/vmui-material/bench/chip/bun-isolated.json bun packages/vmui-material/bench/chip.cjs
node scripts/render-bench-report.cjs packages/vmui-material chip chip.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
