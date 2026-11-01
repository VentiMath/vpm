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

Recorded 2026-11-01T21:43:13.171Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Storage construction | 1594 | 2972 | 78.9% | 78.6% | 78.9% | 2.3% | unestablished at this precision |
| custom endpoint construction | 1116 | 2365 | 111.7% | 287.2% | 79.3% | 11.6% | higher time in every pair, beyond control spread |
| bucket + file handles | 25986 | 22802 | 0.9% | -14% | 0.9% | 4.2% | unestablished at this precision |
| v2 signed URL / RSA fixture | 2243329 | 1041563 | -34.3% | -25.8% | -40.9% | 5.6% | unestablished at this precision |
| v4 signed URL / RSA fixture | 1287341 | 1025558 | -6.3% | -44.4% | -4.9% | 5.3% | unestablished at this precision |
| signer / v2 preparation without RSA | 6939 | 3833 | -39.1% | -53.4% | -28.1% | 3.5% | unestablished at this precision |
| signer / v4 preparation without RSA | 21029 | 11098 | -48.3% | -70.8% | -36.3% | 12.1% | lower time in every pair, beyond control spread |
| signer / canonical headers | 592 | 1028 | 81.8% | 5.9% | 114.6% | 0.9% | unestablished at this precision |
| signer / canonical query | 1597 | 1352 | -14.8% | -34.4% | 56.5% | 2.8% | unestablished at this precision |
| CRC32C / 64KiB | 400075 | 59168 | -87.5% | -87.5% | -85% | 5.4% | lower time in every pair, beyond control spread |
| CRC32C / 64B | 1265 | 168 | -85.1% | -86.1% | -73.2% | 11.5% | lower time in every pair, beyond control spread |
| CRC32C / 64KiB in 1KiB chunks | 450209 | 47959 | -89.1% | -90.7% | -81.8% | 9.6% | lower time in every pair, beyond control spread |
| CRC32C / resumed 32KiB | 290107 | 39362 | -87.1% | -90.8% | -34.9% | 3.8% | unestablished at this precision |
| hash stream / 64KiB / md5 | 169278 | 152822 | -3% | -36.3% | 51.3% | 27.3% | unestablished at this precision |
| hash stream / 64KiB / crc32c | 385846 | 54720 | -87.6% | -91.4% | -79.1% | 55.5% | lower time in every pair, beyond control spread |
| hash stream / 64KiB / both | 463306 | 192133 | -65% | -72.2% | -48.2% | 5.1% | lower time in every pair, beyond control spread |
| HTTP object metadata | 562148 | 479016 | 27.4% | -81.8% | 168.9% | 32.8% | unestablished at this precision |
| HTTP automatic listing / one page | 320094 | 730208 | 29.3% | -16.6% | 443.6% | 15.8% | unestablished at this precision |
| HTTP multipart upload / 64KiB + CRC32C | 1078506 | 1314134 | 5.7% | 18.5% | 4% | 63.2% | unestablished at this precision |
| HTTP download / 64KiB + CRC32C | 849661 | 561473 | -38.5% | -50.5% | 37.8% | 26.9% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T21:44:57.512Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Storage construction | 998 | 2019 | 47.3% | 47.3% | 133.4% | 9.9% | unestablished at this precision |
| custom endpoint construction | 1200 | 1476 | 18.5% | 22.8% | 15.6% | 6.3% | higher time in every pair, beyond control spread |
| bucket + file handles | 17766 | 17469 | -0.4% | -0.3% | -1.6% | 19.9% | unestablished at this precision |
| v2 signed URL / RSA fixture | 734455 | 723564 | -1.6% | -20.2% | -1.6% | 3.7% | unestablished at this precision |
| v4 signed URL / RSA fixture | 717767 | 727504 | 0% | -9.4% | 0% | 3.4% | unestablished at this precision |
| signer / v2 preparation without RSA | 2689 | 2030 | -24.5% | -60.4% | -14.7% | 5.2% | unestablished at this precision |
| signer / v4 preparation without RSA | 11789 | 7998 | -9.6% | -2.9% | -28.7% | 3.8% | unestablished at this precision |
| signer / canonical headers | 352 | 595 | 54.8% | 4% | 81.8% | 28.8% | unestablished at this precision |
| signer / canonical query | 1034 | 767 | -24% | -24% | 51.2% | 4.8% | unestablished at this precision |
| CRC32C / 64KiB | 596950 | 60417 | -89.7% | -30.9% | -91.5% | 2.3% | unestablished at this precision |
| CRC32C / 64B | 982 | 277 | -73.6% | -80.6% | -71.7% | 4.8% | lower time in every pair, beyond control spread |
| CRC32C / 64KiB in 1KiB chunks | 581445 | 39250 | -93.2% | -92.9% | -93.2% | 1.3% | lower time in every pair, beyond control spread |
| CRC32C / resumed 32KiB | 290557 | 20517 | -93.2% | -95.5% | -92.9% | 10.7% | lower time in every pair, beyond control spread |
| hash stream / 64KiB / md5 | 106001 | 107913 | 3.3% | 2.2% | 3.3% | 2.9% | unestablished at this precision |
| hash stream / 64KiB / crc32c | 587529 | 42557 | -92.7% | -88.5% | -92.7% | 0.8% | lower time in every pair, beyond control spread |
| hash stream / 64KiB / both | 685746 | 144646 | -79% | -79.3% | -78.7% | 0.8% | lower time in every pair, beyond control spread |
| HTTP object metadata | 110711 | 176377 | 56.7% | 55.3% | 63.2% | 10% | higher time in every pair, beyond control spread |
| HTTP automatic listing / one page | 109944 | 321803 | 123.5% | -34% | 275.5% | 18.5% | unestablished at this precision |
| HTTP multipart upload / 64KiB + CRC32C | 1059676 | 702484 | -49.5% | -63.9% | -34% | 2.6% | lower time in every pair, beyond control spread |
| HTTP download / 64KiB + CRC32C | 294279 | 397536 | 15.1% | -22.7% | 52.4% | 18.7% | unestablished at this precision |

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
