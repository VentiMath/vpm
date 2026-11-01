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

Recorded 2026-11-01T18:15:31.173Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Storage construction | 979 | 1801 | 88.1% | 79.7% | 90.4% | 6.9% | higher time in every pair, beyond control spread |
| custom endpoint construction | 1060 | 2233 | 112.5% | 101.8% | 114.1% | 8.8% | higher time in every pair, beyond control spread |
| bucket + file handles | 18836 | 17442 | -1.8% | 1.4% | -1.8% | 3% | unestablished at this precision |
| v2 signed URL / RSA fixture | 902532 | 942300 | 6% | 0.7% | 6% | 2.4% | unestablished at this precision |
| v4 signed URL / RSA fixture | 931729 | 921271 | -1.8% | -1.8% | 15.5% | 1.2% | unestablished at this precision |
| CRC32C / 64KiB | 340000 | 42205 | -87.6% | -88.1% | -87.4% | 2.2% | lower time in every pair, beyond control spread |
| CRC32C / 64B | 925 | 157 | -82.2% | -81.2% | -83.4% | 8.3% | lower time in every pair, beyond control spread |
| CRC32C / 64KiB in 1KiB chunks | 357344 | 44167 | -87.6% | -87.6% | -88% | 0.7% | lower time in every pair, beyond control spread |
| CRC32C / resumed 32KiB | 178024 | 21352 | -87.5% | -82.5% | -87.9% | 0.5% | lower time in every pair, beyond control spread |
| HTTP object metadata | 269952 | 212226 | 1.6% | 96.1% | 1.6% | 131.3% | unestablished at this precision |
| HTTP automatic listing / one page | 285640 | 191320 | -13.9% | 27.7% | -13.9% | 22.9% | unestablished at this precision |
| HTTP multipart upload / 64KiB + CRC32C | 953355 | 500313 | -47.2% | -37% | -56.9% | 30.5% | unestablished at this precision |
| HTTP download / 64KiB + CRC32C | 488560 | 367964 | -16.4% | -9.1% | -34.2% | 7% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T18:17:08.683Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Storage construction | 1001 | 881 | -12.5% | -7.8% | -16.3% | 41.5% | unestablished at this precision |
| custom endpoint construction | 1276 | 1484 | 16.4% | 7.8% | 21.9% | 45.3% | unestablished at this precision |
| bucket + file handles | 16949 | 17342 | 0.3% | -0.5% | 1% | 59.9% | unestablished at this precision |
| v2 signed URL / RSA fixture | 716544 | 697651 | -1.5% | -2.7% | 22.2% | 68.1% | unestablished at this precision |
| v4 signed URL / RSA fixture | 717131 | 714033 | -2% | 1.6% | -3.7% | 85.5% | unestablished at this precision |
| CRC32C / 64KiB | 568878 | 46922 | -91.9% | -90.6% | -93.1% | 146.4% | unestablished at this precision |
| CRC32C / 64B | 913 | 234 | -74.3% | -75% | -73.6% | 33.6% | lower time in every pair, beyond control spread |
| CRC32C / 64KiB in 1KiB chunks | 578387 | 39137 | -93.2% | -93.3% | -93.2% | 52.9% | lower time in every pair, beyond control spread |
| CRC32C / resumed 32KiB | 288362 | 19454 | -93.3% | -93.3% | -93.8% | 71.2% | lower time in every pair, beyond control spread |
| HTTP object metadata | 94726 | 116753 | 21.2% | 14.3% | 21.2% | 538.1% | unestablished at this precision |
| HTTP automatic listing / one page | 121481 | 137136 | 10.2% | 24.3% | -0.5% | 991.6% | unestablished at this precision |
| HTTP multipart upload / 64KiB + CRC32C | 1094491 | 358645 | -67.2% | -65.1% | -67.6% | 11.2% | lower time in every pair, beyond control spread |
| HTTP download / 64KiB + CRC32C | 272682 | 242693 | -13.3% | -7.6% | -13.3% | 8% | unestablished at this precision |

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
