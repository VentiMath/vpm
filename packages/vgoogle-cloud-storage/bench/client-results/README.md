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

Recorded 2026-11-02T00:43:52.627Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Storage construction | 1149 | 781 | -31.3% | -29.4% | -33.7% | 24.2% | lower time in every pair, beyond control spread |
| custom endpoint construction | 1258 | 1408 | 13.4% | 16.1% | 10.1% | 6.5% | higher time in every pair, beyond control spread |
| bucket + file handles | 20631 | 805 | -96.1% | -96.3% | -95.8% | 10.1% | lower time in every pair, beyond control spread |
| v2 signed URL / RSA fixture | 1069218 | 1055913 | -1.4% | -0.4% | -3.3% | 9% | unestablished at this precision |
| v4 signed URL / RSA fixture | 1073276 | 1091856 | 2% | 6.9% | -1.6% | 20.1% | unestablished at this precision |
| signer / v2 preparation without RSA | 4399 | 3694 | -15.4% | -13.8% | -21.3% | 25.2% | unestablished at this precision |
| signer / v4 preparation without RSA | 14662 | 10924 | -25.4% | -25.9% | -25.4% | 22.1% | lower time in every pair, beyond control spread |
| signer / canonical headers | 565 | 957 | 69.4% | 69.3% | 69.4% | 24.1% | higher time in every pair, beyond control spread |
| signer / canonical query | 1768 | 1192 | -33.6% | -33.2% | -33.8% | 1.1% | lower time in every pair, beyond control spread |
| CRC32C / 64KiB | 403842 | 49577 | -87.8% | -87.8% | -87.9% | 4.6% | lower time in every pair, beyond control spread |
| CRC32C / 64B | 1017 | 171 | -83.2% | -82.4% | -85% | 3.2% | lower time in every pair, beyond control spread |
| CRC32C / 64KiB in 1KiB chunks | 406473 | 51096 | -87.4% | -84% | -87.4% | 2.8% | lower time in every pair, beyond control spread |
| CRC32C / resumed 32KiB | 205635 | 25422 | -87.6% | -91.9% | -87.6% | 2.4% | lower time in every pair, beyond control spread |
| hash stream / 64KiB / md5 | 123158 | 120201 | -2.2% | -0.7% | -12% | 1.4% | unestablished at this precision |
| hash stream / 64KiB / crc32c | 426243 | 52348 | -87.6% | -87.7% | -87.4% | 0.6% | lower time in every pair, beyond control spread |
| hash stream / 64KiB / both | 527067 | 170653 | -67.6% | -67.6% | -68.6% | 0.9% | lower time in every pair, beyond control spread |
| HTTP object metadata | 368945 | 251231 | -21.9% | -38.8% | -2.1% | 8.6% | unestablished at this precision |
| HTTP automatic listing / one page | 317358 | 201604 | -40.9% | -51.7% | -33.2% | 2% | lower time in every pair, beyond control spread |
| HTTP multipart upload / 64KiB + CRC32C | 1232697 | 745952 | -42.3% | -42.3% | -39.1% | 15.2% | lower time in every pair, beyond control spread |
| HTTP resumable upload / 64KiB + CRC32C | 1796177 | 1019964 | -45.8% | -47.6% | -39% | 1.8% | lower time in every pair, beyond control spread |
| HTTP download / 64KiB + CRC32C | 590416 | 459372 | -21.5% | -19.1% | -24% | 20.4% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-02T00:45:42.453Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Storage construction | 1223 | 361 | -70.7% | -68.2% | -72% | 5% | lower time in every pair, beyond control spread |
| custom endpoint construction | 1461 | 832 | -45.1% | -33.1% | -55.5% | 3.6% | lower time in every pair, beyond control spread |
| bucket + file handles | 19612 | 1724 | -91.1% | -88.6% | -91.1% | 1.7% | lower time in every pair, beyond control spread |
| v2 signed URL / RSA fixture | 856757 | 834209 | -2.2% | 10.6% | -2.2% | 0.4% | unestablished at this precision |
| v4 signed URL / RSA fixture | 848962 | 841373 | -0.7% | 2.8% | -2.4% | 1.3% | unestablished at this precision |
| signer / v2 preparation without RSA | 2808 | 2404 | -15.2% | 1.7% | -15.2% | 1.2% | unestablished at this precision |
| signer / v4 preparation without RSA | 10114 | 7600 | -21.8% | -19.6% | -25.9% | 1.6% | lower time in every pair, beyond control spread |
| signer / canonical headers | 366 | 630 | 73.8% | 75.4% | 59.3% | 0.8% | higher time in every pair, beyond control spread |
| signer / canonical query | 1026 | 749 | -26.9% | -18.9% | -29.1% | 1.8% | lower time in every pair, beyond control spread |
| CRC32C / 64KiB | 679293 | 64484 | -90.5% | -78.3% | -90.5% | 2.7% | lower time in every pair, beyond control spread |
| CRC32C / 64B | 1097 | 326 | -70.3% | -65.7% | -70.3% | 52.5% | lower time in every pair, beyond control spread |
| CRC32C / 64KiB in 1KiB chunks | 680262 | 46477 | -93.2% | -93.1% | -93.2% | 1.3% | lower time in every pair, beyond control spread |
| CRC32C / resumed 32KiB | 338174 | 23631 | -93% | -93% | -93.1% | 1.3% | lower time in every pair, beyond control spread |
| hash stream / 64KiB / md5 | 124276 | 125771 | 1.7% | 13.6% | -0.7% | 0.9% | unestablished at this precision |
| hash stream / 64KiB / crc32c | 684920 | 47207 | -93.1% | -94% | -93% | 1.3% | lower time in every pair, beyond control spread |
| hash stream / 64KiB / both | 801031 | 169944 | -79.1% | -86.9% | -77.9% | 0.6% | lower time in every pair, beyond control spread |
| HTTP object metadata | 109828 | 118206 | 12.5% | 25.9% | 7.8% | 32.9% | unestablished at this precision |
| HTTP automatic listing / one page | 119102 | 129318 | 4.9% | -7.8% | 6.9% | 9.8% | unestablished at this precision |
| HTTP multipart upload / 64KiB + CRC32C | 1322726 | 497808 | -63% | -63% | -59.6% | 5.9% | lower time in every pair, beyond control spread |
| HTTP resumable upload / 64KiB + CRC32C | 1650095 | 753978 | -53.2% | -62.2% | -44.7% | 27.1% | lower time in every pair, beyond control spread |
| HTTP download / 64KiB + CRC32C | 382461 | 354776 | -9.9% | -29.7% | 10% | 15.5% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vgoogle-cloud-storage/bench/client-results/node-isolated.json node packages/vgoogle-cloud-storage/bench/compare.cjs
OUTPUT=packages/vgoogle-cloud-storage/bench/client-results/bun-isolated.json bun packages/vgoogle-cloud-storage/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vgoogle-cloud-storage client-results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
