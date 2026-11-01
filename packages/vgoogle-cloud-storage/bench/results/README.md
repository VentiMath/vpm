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

Recorded 2026-11-01T20:50:15.456Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Storage construction | 1118 | 2138 | 88.3% | 84.4% | 94.2% | 1.9% | higher time in every pair, beyond control spread |
| custom endpoint construction | 1222 | 2680 | 117.4% | 90.1% | 127% | 3.2% | higher time in every pair, beyond control spread |
| bucket + file handles | 20142 | 20324 | -0.3% | -1% | 3.7% | 0.5% | unestablished at this precision |
| v2 signed URL / RSA fixture | 1039571 | 1040745 | 0.5% | -0.1% | 0.9% | 64.4% | unestablished at this precision |
| v4 signed URL / RSA fixture | 1048141 | 1065313 | 2% | 0% | 2% | 2.9% | unestablished at this precision |
| CRC32C / 64KiB | 400817 | 51770 | -87.8% | -88.1% | -75.3% | 2.2% | lower time in every pair, beyond control spread |
| CRC32C / 64B | 977 | 240 | -75.6% | -75.6% | -72.3% | 4.2% | lower time in every pair, beyond control spread |
| CRC32C / 64KiB in 1KiB chunks | 404297 | 52328 | -87.1% | -87.2% | -85.9% | 0.7% | lower time in every pair, beyond control spread |
| CRC32C / resumed 32KiB | 201185 | 24960 | -87.6% | -87.7% | -86.9% | 0.3% | lower time in every pair, beyond control spread |
| hash stream / 64KiB / md5 | 121282 | 124901 | 5% | 5% | 8.3% | 2.4% | unestablished at this precision |
| hash stream / 64KiB / crc32c | 412085 | 56579 | -86.3% | -86.3% | -86% | 0.7% | lower time in every pair, beyond control spread |
| hash stream / 64KiB / both | 522268 | 169004 | -68% | -67.7% | -68.5% | 1.5% | lower time in every pair, beyond control spread |
| HTTP object metadata | 230396 | 252114 | 3.4% | 11.9% | -11.6% | 37.2% | unestablished at this precision |
| HTTP automatic listing / one page | 226600 | 219947 | -20% | 39.8% | -20% | 27.4% | unestablished at this precision |
| HTTP multipart upload / 64KiB + CRC32C | 957835 | 463592 | -51.9% | -45.4% | -52.9% | 6.4% | lower time in every pair, beyond control spread |
| HTTP download / 64KiB + CRC32C | 400454 | 331454 | -15.6% | 3.3% | -28.7% | 36.1% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T20:51:47.598Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Storage construction | 1169 | 1048 | -9.9% | -11% | -9.9% | 30.2% | unestablished at this precision |
| custom endpoint construction | 1403 | 1541 | 10.1% | 7.8% | 15.1% | 10.1% | unestablished at this precision |
| bucket + file handles | 18924 | 19059 | 1.8% | 2.4% | 0.5% | 29.1% | unestablished at this precision |
| v2 signed URL / RSA fixture | 830424 | 833114 | 0.1% | -11.9% | 0.8% | 69.3% | unestablished at this precision |
| v4 signed URL / RSA fixture | 846708 | 845003 | -0.2% | -0.2% | -1.2% | 2% | unestablished at this precision |
| CRC32C / 64KiB | 674003 | 64723 | -90.4% | -90.4% | -90.4% | 22.8% | lower time in every pair, beyond control spread |
| CRC32C / 64B | 1068 | 268 | -76% | -76% | -76.7% | 1.4% | lower time in every pair, beyond control spread |
| CRC32C / 64KiB in 1KiB chunks | 685561 | 46057 | -93.3% | -93.3% | -93.9% | 6.5% | lower time in every pair, beyond control spread |
| CRC32C / resumed 32KiB | 339011 | 23300 | -93.2% | -93.2% | -93.3% | 0.6% | lower time in every pair, beyond control spread |
| hash stream / 64KiB / md5 | 125445 | 122803 | -2% | -1.8% | -8.5% | 3.2% | unestablished at this precision |
| hash stream / 64KiB / crc32c | 680952 | 47663 | -93% | -93% | -93.2% | 2.2% | lower time in every pair, beyond control spread |
| hash stream / 64KiB / both | 805773 | 169704 | -79% | -78.8% | -79% | 7.8% | lower time in every pair, beyond control spread |
| HTTP object metadata | 129603 | 122234 | -0.7% | 8.7% | -12.5% | 34% | unestablished at this precision |
| HTTP automatic listing / one page | 121034 | 124164 | 4.6% | 6.1% | -4.9% | 52.1% | unestablished at this precision |
| HTTP multipart upload / 64KiB + CRC32C | 1170101 | 446149 | -63.9% | -65.6% | -59.8% | 8.6% | lower time in every pair, beyond control spread |
| HTTP download / 64KiB + CRC32C | 286726 | 268386 | -5.8% | -5.8% | -22.7% | 34.2% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vgoogle-cloud-storage/bench/results/node-isolated.json node packages/vgoogle-cloud-storage/bench/compare.cjs
OUTPUT=packages/vgoogle-cloud-storage/bench/results/bun-isolated.json bun packages/vgoogle-cloud-storage/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vgoogle-cloud-storage
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
