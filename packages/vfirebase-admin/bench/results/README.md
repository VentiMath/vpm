# vfirebase-admin measurements

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
Negative changes mean less time; these are local CPU measurements, not
application throughput or latency guarantees.

## Node 24.22.1

Recorded 2026-11-01T12:21:33.467Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / verify RS256 ID token signature | 44123 | 23871 | -45.6% | -44.8% | -46.5% | 3.6% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2741 | 2029 | -25.1% | -25.1% | -23.5% | 3.5% | lower time in every pair, beyond control spread |
| auth / project a user response | 4314 | 4792 | 10.9% | 9.8% | 10.9% | 3.2% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 319 | 213 | -33.2% | -33.3% | -33.2% | 0.6% | lower time in every pair, beyond control spread |
| messaging / copy and validate a message | 1712 | 1423 | -17.2% | -17.2% | -16.4% | 1.4% | lower time in every pair, beyond control spread |
| app / create context and read project | 249 | 326 | 31% | 30.1% | 33% | 1.8% | higher time in every pair, beyond control spread |
| app / repeat initialization with equal options | 665 | 848 | 27.4% | 27.3% | 27.5% | 0.1% | higher time in every pair, beyond control spread |
| app / cached service lookup | 16 | 16 | -0.3% | 0.4% | -3.5% | 4.7% | unestablished at this precision |
| auth / cached OAuth access token | 92 | 95 | 2.5% | -4.7% | 5.3% | 2.5% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 6429 | 1988 | -69.1% | -69.1% | -69.2% | 1.1% | lower time in every pair, beyond control spread |
| app / dispose three services | 492 | 1162 | 136.3% | 140.7% | 127% | 2.3% | higher time in every pair, beyond control spread |
| credential / build application-default context | 23 | 25 | 6.4% | 7% | 6.3% | 3.4% | higher time in every pair, beyond control spread |
| credential / reuse service-account factory | 4076 | 4218 | 3% | 2.5% | 3.5% | 2.2% | unestablished at this precision |
| credential / acquire cached Google client token | 185 | 359 | 94% | 94% | 95.3% | 1.7% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 4086 | 1939 | -52.5% | -52.7% | -52.4% | 2.4% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T12:22:34.569Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / verify RS256 ID token signature | 23363 | 17076 | -27.1% | -27% | -27.1% | 2% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2379 | 1515 | -36.2% | -36.7% | -36.2% | 5.4% | lower time in every pair, beyond control spread |
| auth / project a user response | 1180 | 1363 | 15.2% | 5.3% | 16% | 4.4% | unestablished at this precision |
| auth / serialize a user record | 489 | 266 | -45.2% | -46.9% | -44.6% | 2.5% | lower time in every pair, beyond control spread |
| messaging / copy and validate a message | 2044 | 559 | -72.5% | -71.9% | -76.4% | 2% | lower time in every pair, beyond control spread |
| app / create context and read project | 242 | 204 | -16% | -16.6% | -14.8% | 10.2% | lower time in every pair, beyond control spread |
| app / repeat initialization with equal options | 377 | 475 | 31.1% | 35.4% | 31.1% | 23.5% | higher time in every pair, beyond control spread |
| app / cached service lookup | 13 | 16 | 16.4% | 14.2% | 21.1% | 9.8% | higher time in every pair, beyond control spread |
| auth / cached OAuth access token | 62 | 66 | 6% | -0.3% | 8.7% | 5.4% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 3308 | 1168 | -64.7% | -65.4% | -64.5% | 1.6% | lower time in every pair, beyond control spread |
| app / dispose three services | 402 | 885 | 121.4% | 127.4% | 119.1% | 6.2% | higher time in every pair, beyond control spread |
| credential / build application-default context | 23 | 14 | -40.5% | -38.2% | -41.7% | 2.6% | lower time in every pair, beyond control spread |
| credential / reuse service-account factory | 2028 | 4776 | 130.7% | 128.6% | 137.2% | 3.1% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 156 | 225 | 44.4% | 41.7% | 44.4% | 4.4% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3060 | 1217 | -60.1% | -60.1% | -60.1% | 2.4% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vfirebase-admin/bench/results/node-isolated.json node packages/vfirebase-admin/bench/compare.cjs
OUTPUT=packages/vfirebase-admin/bench/results/bun-isolated.json bun packages/vfirebase-admin/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vfirebase-admin
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
