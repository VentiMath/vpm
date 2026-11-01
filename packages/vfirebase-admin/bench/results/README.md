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

Recorded 2026-11-01T14:10:05.300Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / cached certificate snapshot | 70 | 81 | 16.1% | 18.8% | 12.1% | 7% | higher time in every pair, beyond control spread |
| auth / no-kid RSA verification with cached key | 77005 | 49262 | -35.6% | -35.5% | -36.2% | 0.8% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 44511 | 23475 | -47.2% | -46.5% | -47.8% | 2.4% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 48446 | 28234 | -41.9% | -41.3% | -42.1% | 1.6% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 54872 | 35037 | -36.1% | -35.8% | -36.4% | 6.1% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2734 | 1983 | -27.4% | -27.4% | -27.5% | 0.1% | lower time in every pair, beyond control spread |
| auth / project a user response | 4295 | 4546 | 6.4% | 5.4% | 6.5% | 2.8% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 323 | 216 | -33.5% | -33.5% | -32.9% | 0.9% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 4839 | 5183 | 6.9% | 5.9% | 7.9% | 12% | unestablished at this precision |
| auth / delete 100 users with synthetic transport | 8403 | 8500 | 0.8% | 2% | -0.4% | 13.3% | unestablished at this precision |
| auth / get user through request dispatch | 5160 | 5460 | 5.9% | 5.6% | 7.4% | 37.4% | unestablished at this precision |
| auth / update disabled through request dispatch | 6951 | 6463 | -6.9% | -6.9% | -8.4% | 3% | lower time in every pair, beyond control spread |
| messaging / copy and validate a message | 1722 | 1406 | -18.6% | -17.9% | -18.6% | 2.9% | lower time in every pair, beyond control spread |
| app / create context and read project | 252 | 326 | 30.4% | 30.4% | 27.1% | 4% | higher time in every pair, beyond control spread |
| app / repeat initialization with equal options | 674 | 832 | 23% | 23.9% | 22.7% | 1.9% | higher time in every pair, beyond control spread |
| app / cached service lookup | 16 | 15 | -5.7% | -5.7% | -11.2% | 1.7% | lower time in every pair, beyond control spread |
| auth / cached OAuth access token | 92 | 93 | 1.1% | 3.1% | 0.4% | 10% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 6363 | 1951 | -69.5% | -69.9% | -69.5% | 3.6% | lower time in every pair, beyond control spread |
| app / dispose three services | 482 | 1138 | 136.1% | 181.1% | 133.5% | 1.1% | higher time in every pair, beyond control spread |
| credential / build application-default context | 23 | 24 | 5.8% | 5.7% | 8.1% | 2.4% | higher time in every pair, beyond control spread |
| credential / reuse service-account factory | 4056 | 4294 | 6.1% | 6.1% | 17.9% | 6.6% | unestablished at this precision |
| credential / acquire cached Google client token | 184 | 356 | 94.5% | 96.1% | 90.4% | 3.3% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 4032 | 1936 | -52% | -63.3% | -52% | 2.3% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T14:11:40.353Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / cached certificate snapshot | 43 | 50 | 12.4% | 16.1% | 10% | 6.2% | higher time in every pair, beyond control spread |
| auth / no-kid RSA verification with cached key | 36215 | 20842 | -41.9% | -43.7% | -13.2% | 59% | unestablished at this precision |
| auth / verify RS256 ID token signature | 23950 | 17436 | -26.3% | -25.8% | -27.7% | 78.4% | unestablished at this precision |
| auth / verify ID token with cached test key | 27586 | 22188 | -19.7% | -21.4% | 31.6% | 87.2% | unestablished at this precision |
| auth / verify ID token and synthetic revocation lookup | 30750 | 24469 | -20.1% | -14% | -21.9% | 15.5% | unestablished at this precision |
| auth / decode ID token | 2497 | 1588 | -35.3% | -37.2% | -33.5% | 2.7% | lower time in every pair, beyond control spread |
| auth / project a user response | 1211 | 1566 | 24.1% | 11.9% | 47.1% | 3.6% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 513 | 283 | -45.7% | -55% | -42.6% | 7.3% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 1759 | 1969 | 1.4% | -31.3% | 13.8% | 0.4% | unestablished at this precision |
| auth / delete 100 users with synthetic transport | 1460 | 1288 | -10.5% | -14.2% | -7.3% | 11.8% | unestablished at this precision |
| auth / get user through request dispatch | 2173 | 2226 | 4.4% | 4.2% | 4.4% | 2.2% | unestablished at this precision |
| auth / update disabled through request dispatch | 3397 | 3227 | -5.1% | -5.1% | -2.4% | 5.7% | unestablished at this precision |
| messaging / copy and validate a message | 2115 | 695 | -67.1% | -66.4% | -68.5% | 3.2% | lower time in every pair, beyond control spread |
| app / create context and read project | 261 | 262 | 0.5% | 13.2% | -4.8% | 41.6% | unestablished at this precision |
| app / repeat initialization with equal options | 391 | 1117 | 138.6% | 188.2% | 65.5% | 2.1% | higher time in every pair, beyond control spread |
| app / cached service lookup | 14 | 17 | 23.8% | -17.5% | 38.4% | 7.5% | unestablished at this precision |
| auth / cached OAuth access token | 68 | 76 | 9.9% | -7.4% | 9.9% | 4.1% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 3536 | 1388 | -61.1% | -61.1% | -60.2% | 8.4% | lower time in every pair, beyond control spread |
| app / dispose three services | 450 | 1049 | 132.9% | 130.3% | 178.3% | 2.7% | higher time in every pair, beyond control spread |
| credential / build application-default context | 24 | 20 | -22.1% | -26.7% | -17.3% | 49.4% | unestablished at this precision |
| credential / reuse service-account factory | 2093 | 5279 | 153.4% | 172.6% | 148.5% | 5.8% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 160 | 269 | 54.6% | 35.6% | 112.7% | 6.3% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3146 | 1326 | -57.7% | -56.9% | -57.7% | 3.3% | lower time in every pair, beyond control spread |

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
