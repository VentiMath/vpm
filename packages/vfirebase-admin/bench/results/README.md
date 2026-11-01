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

Recorded 2026-11-01T13:48:17.296Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / cached certificate snapshot | 66 | 83 | 25.3% | 20.6% | 29.5% | 6.5% | higher time in every pair, beyond control spread |
| auth / no-kid RSA verification with cached key | 76230 | 48652 | -36.1% | -35.1% | -37.3% | 1% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 43717 | 23588 | -45.8% | -45.8% | -45.8% | 5.8% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 47883 | 28272 | -40.9% | -40.2% | -41% | 25.5% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 54614 | 35211 | -35.4% | -35.5% | -35.4% | 5.3% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2719 | 1998 | -26.7% | -25.7% | -26.7% | 4.9% | lower time in every pair, beyond control spread |
| auth / project a user response | 4300 | 4598 | 7.2% | 8% | 5.5% | 2% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 324 | 213 | -34.6% | -35.3% | -34.6% | 1.1% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 4809 | 5292 | 10.1% | 10.6% | 9.5% | 0.4% | higher time in every pair, beyond control spread |
| auth / delete 100 users with synthetic transport | 8417 | 8474 | 1.3% | 2.6% | -0.4% | 1.8% | unestablished at this precision |
| messaging / copy and validate a message | 1705 | 1422 | -16.5% | -21% | -15.1% | 4.4% | lower time in every pair, beyond control spread |
| app / create context and read project | 252 | 330 | 30.9% | 27.7% | 30.9% | 5.4% | higher time in every pair, beyond control spread |
| app / repeat initialization with equal options | 672 | 837 | 23.6% | 24.8% | 23.6% | 2.5% | higher time in every pair, beyond control spread |
| app / cached service lookup | 16 | 16 | -0.6% | -0.9% | 0.3% | 6.8% | unestablished at this precision |
| auth / cached OAuth access token | 91 | 92 | 1.3% | 1.3% | 1.9% | 2.8% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 6316 | 1968 | -68.8% | -68.8% | -55.2% | 0.9% | lower time in every pair, beyond control spread |
| app / dispose three services | 498 | 1146 | 135.9% | 128.5% | 240.7% | 3.4% | higher time in every pair, beyond control spread |
| credential / build application-default context | 23 | 25 | 6.8% | 8% | 2.4% | 65.4% | unestablished at this precision |
| credential / reuse service-account factory | 4084 | 4227 | 3.6% | 4.6% | 1.8% | 1.5% | unestablished at this precision |
| credential / acquire cached Google client token | 182 | 358 | 97.2% | 97.2% | 93.6% | 1.1% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 4066 | 1944 | -52.1% | -52.1% | -51.4% | 4.1% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T13:49:44.272Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / cached certificate snapshot | 43 | 49 | 13.6% | 11.6% | 14.6% | 0.5% | higher time in every pair, beyond control spread |
| auth / no-kid RSA verification with cached key | 35782 | 20296 | -43% | -44% | -43% | 2.5% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 23923 | 17404 | -26.8% | -28.9% | -25.2% | 30.9% | unestablished at this precision |
| auth / verify ID token with cached test key | 28098 | 20973 | -24.9% | -24.8% | -25.6% | 2.7% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 30422 | 23601 | -22.8% | -25.4% | -21.1% | 4.8% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2443 | 1511 | -38% | -42.5% | -35.4% | 4.6% | lower time in every pair, beyond control spread |
| auth / project a user response | 1188 | 1360 | 13.7% | 13.4% | 19.1% | 1.3% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 507 | 274 | -46.3% | -47% | -44.6% | 1.2% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 1769 | 1736 | -1.9% | -1.9% | -30.5% | 1.5% | unestablished at this precision |
| auth / delete 100 users with synthetic transport | 1280 | 1163 | -9.1% | -9.1% | -24% | 6.8% | lower time in every pair, beyond control spread |
| messaging / copy and validate a message | 2104 | 666 | -67.2% | -54.5% | -67.2% | 12% | lower time in every pair, beyond control spread |
| app / create context and read project | 313 | 257 | -17.5% | 14% | -28.5% | 19.3% | unestablished at this precision |
| app / repeat initialization with equal options | 524 | 808 | 51.9% | 148.6% | 13.9% | 31.5% | unestablished at this precision |
| app / cached service lookup | 13 | 17 | 30.2% | 31.9% | -5.8% | 16.3% | unestablished at this precision |
| auth / cached OAuth access token | 62 | 72 | 17% | 16.2% | 17% | 4.4% | higher time in every pair, beyond control spread |
| auth / twenty concurrent forced refreshes | 3435 | 1261 | -63.9% | -62.8% | -63.9% | 28% | lower time in every pair, beyond control spread |
| app / dispose three services | 419 | 1037 | 144.2% | 151% | 134.2% | 3.4% | higher time in every pair, beyond control spread |
| credential / build application-default context | 23 | 18 | -28.6% | -25.4% | -34.1% | 1.5% | lower time in every pair, beyond control spread |
| credential / reuse service-account factory | 2024 | 4980 | 139.4% | 139.4% | 146.1% | 3.3% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 155 | 242 | 55.1% | 58% | 55.1% | 3.4% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3095 | 1292 | -59% | -58.1% | -59% | 8.4% | lower time in every pair, beyond control spread |

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
