# vgoogle-cloud-storage measurements

> Historical: this recording predates the independent multipart adapter.
> See [current multipart measurements](../multipart-results/README.md).

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

Recorded 2026-11-01T23:38:22.033Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| stream construction and destroy | 1868 | 4693 | 248.5% | 57.2% | 443.7% | 39.1% | higher time in every pair, beyond control spread |
| stream pipeline / 64 bytes without checksum | 17593 | 23027 | 31.2% | 34.9% | 28.3% | 27.5% | unestablished at this precision |
| stream pipeline / 65536 bytes without checksum | 16657 | 21588 | 28.5% | 24% | 33.3% | 21.4% | unestablished at this precision |
| HTTP multipart upload / 64KiB + CRC32C | 898507 | 579632 | -43.2% | -43.2% | -35.9% | 18.1% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T23:38:43.753Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| stream construction and destroy | 810 | 1424 | 77.5% | 78% | 64.7% | 14.7% | higher time in every pair, beyond control spread |
| stream pipeline / 64 bytes without checksum | 11499 | 12999 | 8.8% | 0.9% | 8.8% | 205.4% | unestablished at this precision |
| stream pipeline / 65536 bytes without checksum | 17466 | 10976 | -33.2% | -45.2% | -24.4% | 12.1% | unestablished at this precision |
| HTTP multipart upload / 64KiB + CRC32C | 1005261 | 417361 | -56.8% | -56.8% | -55.6% | 56% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/stream.cjs:

```sh
OUTPUT=packages/vgoogle-cloud-storage/bench/stream-results/node-isolated.json node packages/vgoogle-cloud-storage/bench/stream.cjs
OUTPUT=packages/vgoogle-cloud-storage/bench/stream-results/bun-isolated.json bun packages/vgoogle-cloud-storage/bench/stream.cjs
node scripts/render-bench-report.cjs packages/vgoogle-cloud-storage stream-results stream.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
