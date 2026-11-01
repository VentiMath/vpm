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

Recorded 2026-11-01T17:12:53.427Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Storage construction | 950 | 1820 | 94.3% | 94.3% | 99.2% | 1.4% | higher time in every pair, beyond control spread |
| custom endpoint construction | 1043 | 2333 | 123.7% | 122.2% | 123.7% | 1.4% | higher time in every pair, beyond control spread |
| bucket + file handles | 17392 | 17282 | -0.8% | -2.4% | 36.8% | 4.2% | unestablished at this precision |
| v2 signed URL / RSA fixture | 862447 | 877197 | 1.4% | 4.9% | 1.4% | 1% | unestablished at this precision |
| v4 signed URL / RSA fixture | 891090 | 879520 | -1.9% | -1.1% | -16.1% | 0.8% | unestablished at this precision |
| CRC32C / 64KiB | 343820 | 343874 | 1.5% | -2.4% | 9.9% | 0.4% | unestablished at this precision |
| HTTP object metadata | 205219 | 178253 | -17.7% | -25% | -5.3% | 25.2% | unestablished at this precision |
| HTTP automatic listing / one page | 191043 | 154447 | -16.7% | -19.5% | -7.9% | 13% | unestablished at this precision |
| HTTP multipart upload / 64KiB + CRC32C | 802715 | 776002 | -8.1% | -50.8% | -3.9% | 8.8% | unestablished at this precision |
| HTTP download / 64KiB + CRC32C | 378119 | 263557 | -29.7% | -47.3% | -28% | 10.3% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T17:13:37.523Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Storage construction | 990 | 906 | -7.6% | -7.6% | -11.1% | 9.5% | unestablished at this precision |
| custom endpoint construction | 1129 | 1358 | 17.6% | 20.6% | 13.9% | 3.5% | higher time in every pair, beyond control spread |
| bucket + file handles | 16338 | 16118 | -1.4% | -1.4% | 5.6% | 2.6% | unestablished at this precision |
| v2 signed URL / RSA fixture | 694360 | 694843 | -0.1% | -0.4% | -0.1% | 5.2% | unestablished at this precision |
| v4 signed URL / RSA fixture | 698833 | 701808 | 0.5% | 1.2% | 0.5% | 70.1% | unestablished at this precision |
| CRC32C / 64KiB | 560363 | 548572 | -2.4% | -0.9% | -3.3% | 1% | unestablished at this precision |
| HTTP object metadata | 99877 | 104691 | 6.6% | -1.7% | 6.6% | 5.7% | unestablished at this precision |
| HTTP automatic listing / one page | 102378 | 118536 | 16.1% | -2.2% | 25.5% | 19.7% | unestablished at this precision |
| HTTP multipart upload / 64KiB + CRC32C | 1015731 | 1047919 | 1.6% | -28.5% | 8.2% | 15.4% | unestablished at this precision |
| HTTP download / 64KiB + CRC32C | 259123 | 261434 | -5.6% | -5.6% | 2.7% | 10.6% | unestablished at this precision |

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
