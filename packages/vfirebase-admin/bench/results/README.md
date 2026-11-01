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

Recorded 2026-11-01T13:21:58.120Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / verify RS256 ID token signature | 45426 | 24892 | -46.4% | -47.8% | -44.1% | 1.5% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2853 | 2059 | -27.2% | -27.2% | -26.9% | 4.8% | lower time in every pair, beyond control spread |
| auth / project a user response | 4471 | 4742 | 8.4% | 14% | 5.4% | 3.8% | unestablished at this precision |
| auth / serialize a user record | 334 | 213 | -37% | -37.9% | -35.5% | 1.6% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 5098 | 5220 | 4.8% | 2.4% | 6.1% | 3.5% | unestablished at this precision |
| auth / delete 100 users with synthetic transport | 8799 | 8553 | -2.7% | -3.3% | -2.2% | 6.5% | unestablished at this precision |
| messaging / copy and validate a message | 1713 | 1426 | -17% | -14.1% | -19.5% | 4% | lower time in every pair, beyond control spread |
| app / create context and read project | 253 | 334 | 33.5% | 33.5% | 31.8% | 13.5% | higher time in every pair, beyond control spread |
| app / repeat initialization with equal options | 690 | 852 | 24.6% | 22.5% | 24.6% | 7.3% | higher time in every pair, beyond control spread |
| app / cached service lookup | 16 | 17 | 5.5% | 10% | -1.4% | 5.3% | unestablished at this precision |
| auth / cached OAuth access token | 94 | 94 | -0.8% | -0.8% | -1.7% | 1.9% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 6386 | 1988 | -68.6% | -67.7% | -68.8% | 3.6% | lower time in every pair, beyond control spread |
| app / dispose three services | 512 | 1176 | 128.8% | 153.9% | 69.4% | 5.1% | higher time in every pair, beyond control spread |
| credential / build application-default context | 24 | 25 | 5.7% | 14.4% | -7.6% | 5.5% | unestablished at this precision |
| credential / reuse service-account factory | 4157 | 4285 | 2.5% | 11.1% | -4.7% | 1% | unestablished at this precision |
| credential / acquire cached Google client token | 193 | 364 | 89.7% | 93.3% | 79.1% | 3.2% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 4274 | 2013 | -53% | -50.6% | -54.5% | 3.4% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T13:23:07.069Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / verify RS256 ID token signature | 23947 | 17556 | -27.5% | -27.5% | -27.5% | 17.6% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2569 | 1594 | -38.5% | -42.3% | -34.1% | 2.9% | lower time in every pair, beyond control spread |
| auth / project a user response | 1253 | 1389 | 10.8% | 11% | 10.8% | 8.3% | unestablished at this precision |
| auth / serialize a user record | 509 | 283 | -44.2% | -45.6% | -42.6% | 5% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 1794 | 1820 | 1.8% | -0.2% | 2.5% | 3.2% | unestablished at this precision |
| auth / delete 100 users with synthetic transport | 1352 | 1311 | -3.6% | -12.8% | 24.3% | 3.8% | unestablished at this precision |
| messaging / copy and validate a message | 2116 | 768 | -64% | -64.6% | -60.7% | 3.7% | lower time in every pair, beyond control spread |
| app / create context and read project | 367 | 291 | -15.4% | -7.8% | -15.4% | 9.1% | unestablished at this precision |
| app / repeat initialization with equal options | 793 | 608 | 9.8% | 46.6% | -24.3% | 12.9% | unestablished at this precision |
| app / cached service lookup | 15 | 19 | 19.7% | -20% | 32.6% | 10.9% | unestablished at this precision |
| auth / cached OAuth access token | 68 | 74 | 8.7% | 1% | 18.1% | 16.1% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 3495 | 1297 | -63.2% | -61.4% | -63.9% | 11.8% | lower time in every pair, beyond control spread |
| app / dispose three services | 482 | 1079 | 122.7% | 141.9% | 119% | 21.1% | higher time in every pair, beyond control spread |
| credential / build application-default context | 27 | 18 | -28.9% | -16.8% | -40.9% | 16.9% | unestablished at this precision |
| credential / reuse service-account factory | 2061 | 4921 | 143.2% | 151.4% | 129.6% | 4.2% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 164 | 237 | 44.7% | 52.6% | 38.9% | 8.1% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3256 | 1357 | -58% | -57.7% | -58.6% | 4.4% | lower time in every pair, beyond control spread |

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
