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

Recorded 2026-11-01T15:16:02.266Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| retry / construct owned default policy | 10 | 16 | 59.8% | 68.5% | 51.3% | 7.5% | higher time in every pair, beyond control spread |
| retry / construct custom policy | 10 | 115 | 1040.3% | 1055.4% | 1039.2% | 12.1% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 9 | 27 | 201.8% | 202.3% | 201.8% | 9.7% | higher time in every pair, beyond control spread |
| retry / Retry-After seconds | 9 | 64 | 639.5% | 599.9% | 646.1% | 9.8% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 242 | 469 | 93.5% | 93.5% | 94.2% | 0.5% | higher time in every pair, beyond control spread |
| auth / cached certificate snapshot | 70 | 80 | 16.4% | 11.8% | 16.7% | 8.6% | unestablished at this precision |
| auth / no-kid RSA verification with cached key | 77679 | 48710 | -37.6% | -35.8% | -38.4% | 1.1% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 43550 | 23421 | -45.8% | -46.3% | -45.2% | 2% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 47909 | 28247 | -40.7% | -42.4% | -39% | 3.8% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 54089 | 35532 | -34.5% | -35.1% | -34.2% | 0.7% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2720 | 2008 | -26.2% | -27.8% | -20.3% | 3.5% | lower time in every pair, beyond control spread |
| auth / project a user response | 4238 | 4625 | 8.5% | 9.5% | 8.5% | 0.5% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 322 | 212 | -33.8% | -34.2% | -33.3% | 0.5% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 4842 | 5352 | 9.9% | 10.6% | 8.5% | 0.6% | higher time in every pair, beyond control spread |
| auth / delete 100 users with synthetic transport | 8610 | 8524 | -2.1% | -3.5% | 0.3% | 43.8% | unestablished at this precision |
| auth / get user through request dispatch | 5182 | 5378 | 3.9% | 7% | 1.5% | 0.5% | unestablished at this precision |
| auth / update disabled through request dispatch | 6901 | 6550 | -5.2% | -5.2% | -5% | 3.1% | lower time in every pair, beyond control spread |
| http / JSON request with synthetic response stream | 2280 | 2649 | 17.6% | 4.9% | 32% | 4.7% | unestablished at this precision |
| http / JSON request with headers and synthetic stream | 2262 | 2898 | 26.8% | 21.7% | 27.4% | 21.7% | unestablished at this precision |
| messaging / copy and validate a message | 1701 | 1404 | -17.4% | -16.6% | -18.8% | 2.1% | lower time in every pair, beyond control spread |
| app / create context and read project | 248 | 342 | 36.8% | 38.8% | 33.8% | 1.6% | higher time in every pair, beyond control spread |
| app / repeat initialization with equal options | 675 | 846 | 25.9% | 26.7% | 25.2% | 5.1% | higher time in every pair, beyond control spread |
| app / cached service lookup | 16 | 15 | -5.9% | -5.9% | 38.6% | 2.6% | unestablished at this precision |
| auth / cached OAuth access token | 89 | 92 | 4.3% | 3.8% | 11.9% | 2.4% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 6329 | 1942 | -69.2% | -69.2% | -50.2% | 2.6% | lower time in every pair, beyond control spread |
| app / dispose three services | 482 | 1135 | 136.5% | 137.4% | 134.5% | 2.5% | higher time in every pair, beyond control spread |
| credential / build application-default context | 23 | 25 | 7.9% | 11.4% | 5.3% | 1.2% | higher time in every pair, beyond control spread |
| credential / reuse service-account factory | 4111 | 4119 | 1.1% | 0% | 3.5% | 5.2% | unestablished at this precision |
| credential / acquire cached Google client token | 182 | 354 | 93.9% | 94.3% | 93.9% | 2.7% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 4014 | 1915 | -52.3% | -52.3% | -52.5% | 1.9% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T15:18:19.761Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| retry / construct owned default policy | 11 | 6 | -46.4% | -45.2% | -46.4% | 1.1% | lower time in every pair, beyond control spread |
| retry / construct custom policy | 3 | 362 | 11816.3% | 10001.9% | 13913% | 1.9% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 5 | 39 | 738.6% | 917.6% | 548.8% | 4.8% | higher time in every pair, beyond control spread |
| retry / Retry-After seconds | 9 | 77 | 786.5% | 767.3% | 815.8% | 2.5% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 42 | 425 | 914.1% | 883.4% | 963.8% | 2.5% | higher time in every pair, beyond control spread |
| auth / cached certificate snapshot | 43 | 46 | 8.5% | 9.4% | 7.4% | 2.5% | higher time in every pair, beyond control spread |
| auth / no-kid RSA verification with cached key | 35589 | 20268 | -43.1% | -39% | -45.1% | 1.3% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 23681 | 17264 | -27.6% | -14.4% | -28.2% | 61.4% | unestablished at this precision |
| auth / verify ID token with cached test key | 27462 | 21063 | -23% | -18.9% | -25% | 12.2% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 30637 | 23726 | -22.7% | -22.7% | -21.2% | 7% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2398 | 1567 | -34.9% | -35.8% | -33.6% | 1% | lower time in every pair, beyond control spread |
| auth / project a user response | 1186 | 1353 | 13.6% | 22.9% | 11.7% | 6.4% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 489 | 270 | -44.7% | -43% | -45.5% | 2.8% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 1695 | 1738 | 3.8% | 4.8% | 2.1% | 14.9% | unestablished at this precision |
| auth / delete 100 users with synthetic transport | 1345 | 1201 | -10.7% | -1.6% | -16.2% | 6.2% | unestablished at this precision |
| auth / get user through request dispatch | 2117 | 2184 | 2.1% | 3.2% | 2.1% | 7.4% | unestablished at this precision |
| auth / update disabled through request dispatch | 3333 | 2987 | -11.2% | -13.4% | -10.1% | 4.4% | lower time in every pair, beyond control spread |
| http / JSON request with synthetic response stream | 2183 | 2399 | 10.8% | 5% | 15.1% | 10.4% | unestablished at this precision |
| http / JSON request with headers and synthetic stream | 2262 | 2748 | 21.3% | 23.2% | 21.3% | 4.7% | higher time in every pair, beyond control spread |
| messaging / copy and validate a message | 2074 | 564 | -71.8% | -72.6% | -64% | 7.4% | lower time in every pair, beyond control spread |
| app / create context and read project | 365 | 222 | -37.2% | -40.2% | -27.8% | 34.9% | unestablished at this precision |
| app / repeat initialization with equal options | 764 | 469 | -38.6% | -39% | 72% | 60.5% | unestablished at this precision |
| app / cached service lookup | 15 | 17 | 12.9% | 14.7% | 12.1% | 6.7% | higher time in every pair, beyond control spread |
| auth / cached OAuth access token | 63 | 72 | 11% | 12.4% | 10.9% | 3.8% | higher time in every pair, beyond control spread |
| auth / twenty concurrent forced refreshes | 3423 | 1148 | -66.5% | -65.8% | -67.3% | 2% | lower time in every pair, beyond control spread |
| app / dispose three services | 456 | 881 | 94.3% | 94.3% | 95.5% | 18.6% | higher time in every pair, beyond control spread |
| credential / build application-default context | 27 | 14 | -49.7% | -47.7% | -49.7% | 8.9% | lower time in every pair, beyond control spread |
| credential / reuse service-account factory | 2031 | 4846 | 135.2% | 112.6% | 137.9% | 14.5% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 162 | 224 | 38.4% | 38.4% | 38.2% | 2.6% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3003 | 1257 | -58% | -58.9% | -58% | 3.9% | lower time in every pair, beyond control spread |

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
