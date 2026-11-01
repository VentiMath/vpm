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
Negative changes mean less time; these are local workload measurements, not
application throughput or latency guarantees.

## Node 24.22.1

Recorded 2026-11-01T16:25:45.783Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| authorization / JSON request and synthetic stream | 2523 | 3730 | 47.9% | 50.6% | 37.3% | 8.1% | higher time in every pair, beyond control spread |
| authorization / explicit headers and synthetic stream | 2461 | 3145 | 27.8% | 38.5% | 27.8% | 4.1% | higher time in every pair, beyond control spread |
| http2 / JSON request and synthetic stream | 2867 | 3117 | 9.5% | 3.8% | 9.5% | 7% | unestablished at this precision |
| http2 / twenty requests on a synthetic session | 42462 | 54391 | 28.3% | 28.6% | 24.2% | 6.4% | higher time in every pair, beyond control spread |
| http2 / create and close synthetic batch session | 99 | 88 | -9.7% | -2.3% | -16.8% | 7.9% | unestablished at this precision |
| retry / construct owned default policy | 14 | 9 | -33.8% | -13.6% | -40.2% | 8.2% | unestablished at this precision |
| retry / construct custom policy | 10 | 113 | 993.6% | 1061% | 929.4% | 10% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 9 | 26 | 196.1% | 206.3% | 184% | 8.1% | higher time in every pair, beyond control spread |
| retry / Retry-After seconds | 9 | 63 | 639.3% | 656.1% | 613.3% | 7.9% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 242 | 464 | 91.5% | 93.3% | 86.7% | 1.6% | higher time in every pair, beyond control spread |
| auth / cached certificate snapshot | 72 | 79 | 9.7% | 9.7% | 9.1% | 5.1% | unestablished at this precision |
| auth / no-kid RSA verification with cached key | 80251 | 50065 | -37.6% | -36.8% | -38.2% | 1.7% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 43266 | 23140 | -46.8% | -46% | -46.8% | 13.2% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 46299 | 27878 | -39.7% | -40.9% | -39% | 2% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 53359 | 34089 | -35.5% | -38% | -34.6% | 1.4% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2691 | 1955 | -28.2% | -32.4% | -27.8% | 3.6% | lower time in every pair, beyond control spread |
| auth / project a user response | 4233 | 4465 | 5.7% | 4.9% | 6.1% | 1.3% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 316 | 207 | -34.4% | -34.6% | -34.4% | 3.5% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 4820 | 5147 | 6.3% | 6% | 6.9% | 2% | higher time in every pair, beyond control spread |
| auth / delete 100 users with synthetic transport | 10335 | 10601 | 2.6% | 0.2% | 6.2% | 2.2% | unestablished at this precision |
| auth / get user through request dispatch | 5100 | 5268 | 3% | 3% | 5.3% | 10.1% | unestablished at this precision |
| auth / update disabled through request dispatch | 6936 | 6437 | -7% | -8.2% | 73.9% | 2.1% | unestablished at this precision |
| http / JSON request with synthetic response stream | 2198 | 2449 | 10.7% | 12.8% | 10.4% | 19.4% | unestablished at this precision |
| http / JSON request with headers and synthetic stream | 2264 | 2781 | 22.7% | 25.5% | -4.4% | 2.1% | unestablished at this precision |
| messaging / copy and validate a message | 1687 | 1404 | -17.5% | -16.6% | -17.5% | 0.8% | lower time in every pair, beyond control spread |
| app / create context and read project | 247 | 324 | 30.6% | 30.6% | 30.6% | 1.9% | higher time in every pair, beyond control spread |
| app / repeat initialization with equal options | 664 | 827 | 24.9% | 23.4% | 25.9% | 9.8% | higher time in every pair, beyond control spread |
| app / cached service lookup | 16 | 15 | -6% | -7.3% | 0.4% | 7.5% | unestablished at this precision |
| auth / cached OAuth access token | 94 | 90 | -4.6% | -19.6% | -2.7% | 5.7% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 6212 | 1936 | -68.8% | -68.8% | -69.3% | 1.6% | lower time in every pair, beyond control spread |
| app / dispose three services | 483 | 1132 | 134.6% | 136.9% | 131.7% | 2.5% | higher time in every pair, beyond control spread |
| credential / build application-default context | 23 | 24 | 3.7% | -15.2% | 5.3% | 13.6% | unestablished at this precision |
| credential / reuse service-account factory | 4091 | 4166 | 1.8% | 1.8% | 4.2% | 1.8% | unestablished at this precision |
| credential / acquire cached Google client token | 180 | 353 | 94.2% | 94.2% | 28% | 56.8% | unestablished at this precision |
| credential / twenty concurrent acquisitions | 3949 | 1925 | -51.5% | -51.5% | -55% | 11.9% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T16:28:16.753Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| authorization / JSON request and synthetic stream | 2212 | 3208 | 43.7% | 46% | 41.1% | 3% | higher time in every pair, beyond control spread |
| authorization / explicit headers and synthetic stream | 2237 | 3496 | 56.3% | 58.9% | 54.5% | 4.9% | higher time in every pair, beyond control spread |
| http2 / JSON request and synthetic stream | 2652 | 3805 | 43.5% | 50.7% | 33.8% | 1.5% | higher time in every pair, beyond control spread |
| http2 / twenty requests on a synthetic session | 44517 | 61582 | 37.4% | 37.1% | 43.4% | 3.4% | higher time in every pair, beyond control spread |
| http2 / create and close synthetic batch session | 69 | 68 | -2% | -2.6% | -0.2% | 13.6% | unestablished at this precision |
| retry / construct owned default policy | 14 | 7 | -47.6% | -60.6% | -37.1% | 12.6% | lower time in every pair, beyond control spread |
| retry / construct custom policy | 14 | 382 | 2689.7% | 2618.7% | 6956.7% | 32.2% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 11 | 46 | 502.9% | 181.5% | 847.2% | 6.2% | higher time in every pair, beyond control spread |
| retry / Retry-After seconds | 19 | 79 | 323.9% | 293% | 341.9% | 7.1% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 50 | 428 | 749.3% | 749.3% | 772.2% | 2.6% | higher time in every pair, beyond control spread |
| auth / cached certificate snapshot | 43 | 49 | 13.2% | 13.8% | 11.3% | 5.3% | higher time in every pair, beyond control spread |
| auth / no-kid RSA verification with cached key | 35679 | 20433 | -42.9% | -42.7% | -58.5% | 4.6% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 24231 | 17116 | -29.2% | -32.3% | -28.6% | 28.7% | unestablished at this precision |
| auth / verify ID token with cached test key | 27610 | 20783 | -24.7% | -25.5% | -14% | 5.1% | unestablished at this precision |
| auth / verify ID token and synthetic revocation lookup | 30546 | 23474 | -23.2% | -23.2% | -21.2% | 5.6% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2471 | 1530 | -38.2% | -40.5% | -34.8% | 5.5% | lower time in every pair, beyond control spread |
| auth / project a user response | 1214 | 1405 | 15.7% | 15.2% | 16.6% | 6.8% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 514 | 274 | -47.2% | -45.7% | -47.4% | 7.9% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 1768 | 1780 | 1.1% | -0.1% | 1.8% | 1.7% | unestablished at this precision |
| auth / delete 100 users with synthetic transport | 1279 | 1257 | -1.3% | -1.2% | -1.5% | 23.3% | unestablished at this precision |
| auth / get user through request dispatch | 2203 | 2175 | -1.6% | -2.7% | -1.6% | 3% | unestablished at this precision |
| auth / update disabled through request dispatch | 3518 | 3000 | -14.2% | -12.2% | -15% | 2.3% | lower time in every pair, beyond control spread |
| http / JSON request with synthetic response stream | 2254 | 3051 | 38.1% | 35.6% | 38.1% | 9.1% | higher time in every pair, beyond control spread |
| http / JSON request with headers and synthetic stream | 2383 | 3178 | 33.8% | 50.5% | 24.9% | 27.8% | unestablished at this precision |
| messaging / copy and validate a message | 2028 | 583 | -71.2% | -57.2% | -71.7% | 7% | lower time in every pair, beyond control spread |
| app / create context and read project | 374 | 221 | -36.4% | -16.1% | -36.4% | 105.2% | unestablished at this precision |
| app / repeat initialization with equal options | 774 | 585 | 12.1% | 9.2% | 12.1% | 111.4% | unestablished at this precision |
| app / cached service lookup | 14 | 19 | 33.9% | 30.7% | 40.8% | 14.1% | higher time in every pair, beyond control spread |
| auth / cached OAuth access token | 62 | 70 | 11.7% | 10.8% | 21.7% | 3.6% | higher time in every pair, beyond control spread |
| auth / twenty concurrent forced refreshes | 3432 | 1171 | -65.6% | -65.6% | -66.3% | 4.4% | lower time in every pair, beyond control spread |
| app / dispose three services | 466 | 889 | 98.2% | 100.9% | 96.9% | 4.4% | higher time in every pair, beyond control spread |
| credential / build application-default context | 23 | 16 | -32.2% | -32.2% | -35.5% | 9.8% | lower time in every pair, beyond control spread |
| credential / reuse service-account factory | 2017 | 4853 | 139.9% | 149.1% | 139.9% | 2.5% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 155 | 246 | 58% | 62.9% | 58% | 4.5% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 2992 | 1336 | -55.9% | -55.4% | -56.7% | 5.8% | lower time in every pair, beyond control spread |

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
