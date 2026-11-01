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

Recorded 2026-11-01T15:50:54.150Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| authorization / JSON request and synthetic stream | 2500 | 3746 | 49.9% | 67.3% | 28.8% | 5.7% | higher time in every pair, beyond control spread |
| authorization / explicit headers and synthetic stream | 2484 | 3218 | 29.1% | 30.7% | 21.1% | 4% | higher time in every pair, beyond control spread |
| retry / construct owned default policy | 11 | 16 | 50.5% | 60.2% | 20.1% | 2.3% | unestablished at this precision |
| retry / construct custom policy | 10 | 112 | 1044.1% | 1042.5% | 1044.1% | 32.2% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 9 | 26 | 201.8% | 208% | 192.6% | 7.9% | higher time in every pair, beyond control spread |
| retry / Retry-After seconds | 8 | 64 | 656% | 705.2% | 482.3% | 8.5% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 241 | 466 | 93.4% | 115.2% | 91.1% | 0.7% | higher time in every pair, beyond control spread |
| auth / cached certificate snapshot | 69 | 80 | 18.2% | 34.8% | 16.6% | 1.9% | higher time in every pair, beyond control spread |
| auth / no-kid RSA verification with cached key | 84384 | 51169 | -39.4% | -54% | -37.8% | 5.4% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 42708 | 23147 | -45.8% | -42.5% | -46.9% | 2% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 46573 | 27838 | -40.3% | -40.3% | -40.3% | 10.9% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 54405 | 35243 | -35.9% | -34.3% | -35.9% | 7.1% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2697 | 1980 | -26.7% | -26.8% | -26.5% | 0.8% | lower time in every pair, beyond control spread |
| auth / project a user response | 4284 | 4554 | 5.6% | 8.4% | 4% | 4.2% | unestablished at this precision |
| auth / serialize a user record | 318 | 207 | -34.7% | -34.7% | -34.3% | 3.7% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 4815 | 5219 | 7.8% | 55.8% | 7.8% | 1.9% | unestablished at this precision |
| auth / delete 100 users with synthetic transport | 10234 | 10116 | -0.4% | 7.6% | -2.2% | 5.5% | unestablished at this precision |
| auth / get user through request dispatch | 5143 | 5294 | 3.9% | 4.2% | 2.5% | 1.4% | unestablished at this precision |
| auth / update disabled through request dispatch | 6913 | 6908 | -0.2% | -2.8% | 69.3% | 3.6% | unestablished at this precision |
| http / JSON request with synthetic response stream | 2133 | 2488 | 16.7% | 16.7% | 17.6% | 4.8% | unestablished at this precision |
| http / JSON request with headers and synthetic stream | 2204 | 2759 | 24.5% | 20.1% | 28.1% | 4.3% | higher time in every pair, beyond control spread |
| messaging / copy and validate a message | 1715 | 1409 | -18.6% | -21.9% | -13.7% | 3.3% | lower time in every pair, beyond control spread |
| app / create context and read project | 250 | 322 | 30% | 28.9% | 30% | 0.7% | higher time in every pair, beyond control spread |
| app / repeat initialization with equal options | 673 | 851 | 26.7% | 30.2% | 26.7% | 1% | higher time in every pair, beyond control spread |
| app / cached service lookup | 16 | 15 | -6.6% | -7.1% | 0% | 4.8% | unestablished at this precision |
| auth / cached OAuth access token | 91 | 90 | -0.7% | -3.6% | 0.3% | 2% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 6250 | 1973 | -68.6% | -68.8% | -68.5% | 2.8% | lower time in every pair, beyond control spread |
| app / dispose three services | 478 | 1144 | 137.2% | 132.3% | 149.4% | 2.7% | higher time in every pair, beyond control spread |
| credential / build application-default context | 23 | 24 | 4.3% | 4.3% | -27% | 7.4% | unestablished at this precision |
| credential / reuse service-account factory | 4102 | 4100 | 0.4% | 2.7% | -14.7% | 1.2% | unestablished at this precision |
| credential / acquire cached Google client token | 183 | 359 | 98.6% | 99.9% | 81.2% | 3.6% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3967 | 1938 | -51.4% | -51.6% | -50.1% | 1.6% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T15:53:17.704Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| authorization / JSON request and synthetic stream | 2248 | 3165 | 41.7% | 41.7% | 40.7% | 2.3% | higher time in every pair, beyond control spread |
| authorization / explicit headers and synthetic stream | 2220 | 3464 | 53.8% | 57% | 53.6% | 2.1% | higher time in every pair, beyond control spread |
| retry / construct owned default policy | 11 | 7 | -34.4% | -36.5% | -33.3% | 3.1% | lower time in every pair, beyond control spread |
| retry / construct custom policy | 3 | 373 | 11720.4% | 9932% | 13813.4% | 5.4% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 5 | 47 | 888% | 925.2% | 828.5% | 11.7% | higher time in every pair, beyond control spread |
| retry / Retry-After seconds | 12 | 79 | 634.6% | 322.7% | 1426.7% | 126.6% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 47 | 437 | 817% | 886.9% | 755.5% | 0.2% | higher time in every pair, beyond control spread |
| auth / cached certificate snapshot | 44 | 51 | 17.5% | 31.4% | 16.2% | 3.3% | higher time in every pair, beyond control spread |
| auth / no-kid RSA verification with cached key | 35375 | 20323 | -42.4% | -42.9% | -42.4% | 3% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 23892 | 17368 | -27.3% | -25.1% | -30.1% | 3.1% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 27821 | 20855 | -25.3% | -24.4% | -25.9% | 2.4% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 30388 | 23931 | -21.8% | -18.8% | -22.6% | 2.4% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2400 | 1534 | -36.1% | -36.1% | -35.6% | 154% | unestablished at this precision |
| auth / project a user response | 1175 | 1413 | 20.1% | 24.4% | 18.4% | 52.3% | unestablished at this precision |
| auth / serialize a user record | 498 | 283 | -43.3% | -43.1% | -43.6% | 0.5% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 1707 | 1787 | 4.8% | 6.7% | 0.7% | 9.2% | unestablished at this precision |
| auth / delete 100 users with synthetic transport | 1278 | 1259 | -1.9% | 0.3% | -3.9% | 7.4% | unestablished at this precision |
| auth / get user through request dispatch | 2124 | 2141 | 1.7% | 3.6% | -0.6% | 1.3% | unestablished at this precision |
| auth / update disabled through request dispatch | 3351 | 2874 | -14.4% | -9.2% | -14.4% | 12.3% | unestablished at this precision |
| http / JSON request with synthetic response stream | 2211 | 2599 | 15.4% | 16.3% | 15.4% | 3.9% | higher time in every pair, beyond control spread |
| http / JSON request with headers and synthetic stream | 2294 | 3213 | 38.5% | 50% | 37.4% | 12.7% | higher time in every pair, beyond control spread |
| messaging / copy and validate a message | 2052 | 563 | -72.5% | -60% | -72.6% | 96.1% | unestablished at this precision |
| app / create context and read project | 308 | 218 | -26.5% | -0.2% | -40.3% | 98.6% | unestablished at this precision |
| app / repeat initialization with equal options | 539 | 1076 | 46% | 152.8% | 42.8% | 170.5% | unestablished at this precision |
| app / cached service lookup | 13 | 18 | 41.4% | 54.7% | 41.4% | 5.3% | higher time in every pair, beyond control spread |
| auth / cached OAuth access token | 63 | 74 | 16.9% | 25.8% | 10.6% | 0.9% | higher time in every pair, beyond control spread |
| auth / twenty concurrent forced refreshes | 3413 | 1163 | -65.7% | -63.9% | -66% | 15.9% | lower time in every pair, beyond control spread |
| app / dispose three services | 439 | 871 | 98.7% | 107.8% | 89.9% | 1.6% | higher time in every pair, beyond control spread |
| credential / build application-default context | 24 | 14 | -39% | -39% | -40.8% | 46.1% | unestablished at this precision |
| credential / reuse service-account factory | 2034 | 4680 | 131.9% | 130% | 131.9% | 6.3% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 158 | 228 | 48.6% | 44.6% | 48.6% | 4.2% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3048 | 1258 | -58.6% | -58.8% | -58.3% | 25.4% | lower time in every pair, beyond control spread |

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
