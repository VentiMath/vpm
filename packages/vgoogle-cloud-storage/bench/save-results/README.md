# vgoogle-cloud-storage measurements

> Historical: this recording predates the independent createWriteStream pipeline.
> See [current stream measurements](../stream-results/README.md).

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

Recorded 2026-11-01T23:07:32.679Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| save orchestration / 64 bytes | 815 | 1830 | 125.9% | 135.5% | 116.1% | 0.5% | higher time in every pair, beyond control spread |
| save orchestration / 65536 bytes | 750 | 5599 | 661.7% | 624.9% | 700.9% | 3.7% | higher time in every pair, beyond control spread |
| save orchestration / callback | 839 | 1255 | 49.6% | 43.4% | 54.6% | 6.8% | higher time in every pair, beyond control spread |
| HTTP multipart upload / 64KiB + CRC32C | 938829 | 505962 | -44.4% | -44.4% | -46% | 11.6% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T23:07:51.570Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| save orchestration / 64 bytes | 733 | 847 | 14% | 10.1% | 16.2% | 6.2% | higher time in every pair, beyond control spread |
| save orchestration / 65536 bytes | 766 | 4017 | 423.9% | 391.4% | 463.9% | 7.9% | higher time in every pair, beyond control spread |
| save orchestration / callback | 929 | 863 | -8.3% | -10.8% | -4.5% | 1.8% | lower time in every pair, beyond control spread |
| HTTP multipart upload / 64KiB + CRC32C | 1160803 | 452082 | -60.7% | -60.9% | -58.4% | 5.8% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/save.cjs:

```sh
OUTPUT=packages/vgoogle-cloud-storage/bench/save-results/node-isolated.json node packages/vgoogle-cloud-storage/bench/save.cjs
OUTPUT=packages/vgoogle-cloud-storage/bench/save-results/bun-isolated.json bun packages/vgoogle-cloud-storage/bench/save.cjs
node scripts/render-bench-report.cjs packages/vgoogle-cloud-storage save-results save.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
