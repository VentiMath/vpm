# vgoogle-cloud-storage measurements

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

Recorded 2026-11-01T23:55:35.239Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| multipart plan / metadata and progress stream | 964 | 2284 | 174.2% | 76.2% | 282% | 2.9% | higher time in every pair, beyond control spread |
| HTTP multipart upload / 65536 bytes + CRC32C | 1082650 | 523969 | -48.5% | -59.8% | -38.3% | 4.5% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T23:55:45.847Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| multipart plan / metadata and progress stream | 557 | 1215 | 119.8% | 116.4% | 121.4% | 22% | higher time in every pair, beyond control spread |
| HTTP multipart upload / 65536 bytes + CRC32C | 992149 | 455638 | -55.7% | -55.7% | -54% | 5.9% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/multipart.cjs:

```sh
OUTPUT=packages/vgoogle-cloud-storage/bench/multipart-results/node-isolated.json node packages/vgoogle-cloud-storage/bench/multipart.cjs
OUTPUT=packages/vgoogle-cloud-storage/bench/multipart-results/bun-isolated.json bun packages/vgoogle-cloud-storage/bench/multipart.cjs
node scripts/render-bench-report.cjs packages/vgoogle-cloud-storage multipart-results multipart.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
