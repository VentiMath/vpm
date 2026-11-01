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

Recorded 2026-11-01T16:49:48.794Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| firestore / project client options | 177 | 141 | -21% | -16.5% | -23.9% | 7.9% | lower time in every pair, beyond control spread |
| firestore / cached database client | 11 | 12 | 1.9% | 52.1% | -2.9% | 10.6% | unestablished at this precision |
| firestore / repeat initialized settings | 19 | 13 | -31.6% | -41.8% | -31.2% | 1% | lower time in every pair, beyond control spread |
| response / project JSON and consume data | 903 | 938 | 4.4% | 9.6% | -0.4% | 2.2% | unestablished at this precision |
| response / malformed JSON diagnostic | 8726 | 9518 | 9.3% | 6.4% | 10.8% | 2.4% | higher time in every pair, beyond control spread |
| response / classify empty response | 4191 | 4423 | 5.5% | 4.2% | 7.3% | 3.1% | higher time in every pair, beyond control spread |
| authorization / JSON request and synthetic stream | 2963 | 3737 | 25.5% | 20.2% | 25.5% | 3.5% | unestablished at this precision |
| authorization / explicit headers and synthetic stream | 2883 | 3427 | 21.7% | 21.7% | 19.3% | 1.3% | higher time in every pair, beyond control spread |
| http2 / JSON request and synthetic stream | 2609 | 4110 | 57.8% | 67.3% | 39.1% | 12.2% | higher time in every pair, beyond control spread |
| http2 / twenty requests on a synthetic session | 48899 | 55742 | 13.7% | 47.9% | 12.7% | 33.6% | unestablished at this precision |
| http2 / create and close synthetic batch session | 112 | 128 | 22.3% | 11.5% | 57% | 56.2% | unestablished at this precision |
| retry / construct owned default policy | 14 | 9 | -37% | -36% | -37.5% | 1.7% | lower time in every pair, beyond control spread |
| retry / construct custom policy | 10 | 114 | 1046.4% | 1053.8% | 1037.3% | 1.2% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 9 | 26 | 203.1% | 205.1% | 202.5% | 117.6% | higher time in every pair, beyond control spread |
| retry / Retry-After seconds | 8 | 63 | 661.5% | 661.5% | 668.2% | 48.5% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 240 | 466 | 94.4% | 94.4% | 93.9% | 17% | higher time in every pair, beyond control spread |
| auth / cached certificate snapshot | 68 | 81 | 19.9% | 22.9% | 17.9% | 13.7% | higher time in every pair, beyond control spread |
| auth / no-kid RSA verification with cached key | 79139 | 50932 | -35.5% | -35.5% | -36.2% | 4.4% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 43385 | 23455 | -46.1% | -45.2% | -46.5% | 31.9% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 47914 | 27983 | -41.6% | -40.8% | -42.1% | 8.8% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 54102 | 34663 | -35.8% | -35.8% | -51.4% | 4.7% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2799 | 2053 | -27% | -25% | -27.9% | 1.6% | lower time in every pair, beyond control spread |
| auth / project a user response | 4322 | 4583 | 7% | 7% | 9% | 2.6% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 321 | 208 | -35.1% | -35.2% | -35.1% | 5.7% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 4863 | 5207 | 7.2% | 6% | 8% | 153.6% | unestablished at this precision |
| auth / delete 100 users with synthetic transport | 10258 | 10405 | 1.8% | 6.3% | -1.8% | 137.7% | unestablished at this precision |
| auth / get user through request dispatch | 5176 | 5301 | 2.3% | 2.3% | 1% | 16.4% | unestablished at this precision |
| auth / update disabled through request dispatch | 7010 | 6531 | -6.8% | -8.4% | -5.6% | 11.2% | unestablished at this precision |
| http / JSON request with synthetic response stream | 2600 | 2615 | 1.1% | -6.6% | 7.2% | 27% | unestablished at this precision |
| http / JSON request with headers and synthetic stream | 2455 | 2916 | 19.3% | 23.5% | 16.1% | 2.6% | higher time in every pair, beyond control spread |
| messaging / copy and validate a message | 1740 | 1426 | -18.5% | -18.9% | -17.2% | 2.2% | lower time in every pair, beyond control spread |
| app / create context and read project | 250 | 332 | 33.3% | 36.9% | 28.7% | 1% | higher time in every pair, beyond control spread |
| app / repeat initialization with equal options | 676 | 828 | 22.9% | 24.8% | 20.5% | 1.6% | higher time in every pair, beyond control spread |
| app / cached service lookup | 16 | 17 | 5.8% | 10% | 5.3% | 1.2% | higher time in every pair, beyond control spread |
| auth / cached OAuth access token | 89 | 90 | 1% | 14.8% | 0% | 7.5% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 6213 | 1942 | -68.7% | -52.2% | -69.2% | 2.9% | lower time in every pair, beyond control spread |
| app / dispose three services | 485 | 1154 | 137.9% | 141.1% | 137.2% | 2% | higher time in every pair, beyond control spread |
| credential / build application-default context | 23 | 24 | 8% | 3.1% | 8% | 3.4% | unestablished at this precision |
| credential / reuse service-account factory | 4075 | 4141 | 1.2% | 1.9% | 1.2% | 1.1% | unestablished at this precision |
| credential / acquire cached Google client token | 182 | 362 | 102.8% | 98.2% | 106.1% | 3.1% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3993 | 1916 | -52% | -52.4% | -51.1% | 1.7% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T16:52:52.243Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| firestore / project client options | 75 | 79 | 6.9% | 3.7% | 10.6% | 0.4% | higher time in every pair, beyond control spread |
| firestore / cached database client | 9 | 10 | 17.6% | 17% | 18.4% | 1.9% | higher time in every pair, beyond control spread |
| firestore / repeat initialized settings | 17 | 11 | -35.2% | -35.2% | -34% | 38.6% | unestablished at this precision |
| response / project JSON and consume data | 610 | 644 | 5.3% | 5.6% | 5.3% | 1.5% | higher time in every pair, beyond control spread |
| response / malformed JSON diagnostic | 1047 | 1019 | -1.7% | 46.5% | -3% | 2.3% | unestablished at this precision |
| response / classify empty response | 457 | 445 | -2.7% | -4.9% | 0.3% | 1.6% | unestablished at this precision |
| authorization / JSON request and synthetic stream | 2247 | 3164 | 40.4% | 40.4% | 40.4% | 4.5% | higher time in every pair, beyond control spread |
| authorization / explicit headers and synthetic stream | 2281 | 3432 | 52.3% | 45.6% | 57.1% | 2.1% | higher time in every pair, beyond control spread |
| http2 / JSON request and synthetic stream | 2439 | 3725 | 52.9% | 47.2% | 52.9% | 4.3% | higher time in every pair, beyond control spread |
| http2 / twenty requests on a synthetic session | 46334 | 61910 | 33.6% | 22.8% | 33.6% | 2.5% | higher time in every pair, beyond control spread |
| http2 / create and close synthetic batch session | 63 | 64 | 1.2% | 1.2% | 0.8% | 10.4% | unestablished at this precision |
| retry / construct owned default policy | 17 | 4 | -74.3% | -61.6% | -75.9% | 1.5% | lower time in every pair, beyond control spread |
| retry / construct custom policy | 12 | 362 | 3057.1% | 3011.5% | 3171.1% | 2.2% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 13 | 48 | 254.4% | 253.8% | 268% | 1.9% | higher time in every pair, beyond control spread |
| retry / Retry-After seconds | 15 | 76 | 434.8% | 428.2% | 434.8% | 1% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 42 | 429 | 926.6% | 952.3% | 876.5% | 14.6% | higher time in every pair, beyond control spread |
| auth / cached certificate snapshot | 43 | 49 | 11.5% | 18.1% | 11.5% | 21.4% | unestablished at this precision |
| auth / no-kid RSA verification with cached key | 35219 | 20343 | -42.2% | -38% | -43.8% | 2.7% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 23767 | 17282 | -27.3% | -27.4% | -27.2% | 3.8% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 27568 | 20970 | -23.7% | -21.3% | -25.1% | 1.5% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 30267 | 23350 | -22.8% | -23.6% | -22.2% | 1.1% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2289 | 1501 | -34.9% | -34.5% | -36.6% | 39.6% | unestablished at this precision |
| auth / project a user response | 1172 | 1402 | 19.5% | 18.5% | 19.9% | 1.8% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 494 | 278 | -43.9% | -41.2% | -45.5% | 12.5% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 1681 | 1814 | 8.5% | 13% | 6.2% | 4.5% | higher time in every pair, beyond control spread |
| auth / delete 100 users with synthetic transport | 1553 | 1426 | -9% | -9% | -10.5% | 3.3% | lower time in every pair, beyond control spread |
| auth / get user through request dispatch | 2187 | 2237 | 0.9% | 9.5% | 0.9% | 5.2% | unestablished at this precision |
| auth / update disabled through request dispatch | 3455 | 3095 | -10.8% | -5.9% | -10.9% | 5.9% | unestablished at this precision |
| http / JSON request with synthetic response stream | 2350 | 2843 | 16.4% | 16.4% | 22.5% | 2.6% | higher time in every pair, beyond control spread |
| http / JSON request with headers and synthetic stream | 2506 | 3141 | 24.5% | 34.8% | 17.1% | 0.8% | higher time in every pair, beyond control spread |
| messaging / copy and validate a message | 1664 | 550 | -62% | -47.8% | -75.7% | 76.2% | unestablished at this precision |
| app / create context and read project | 269 | 192 | -19.8% | 6.5% | -47.2% | 107.6% | unestablished at this precision |
| app / repeat initialization with equal options | 478 | 570 | 28.1% | 158.7% | -18.7% | 179.6% | unestablished at this precision |
| app / cached service lookup | 14 | 17 | 22% | 14.4% | 28.8% | 6.1% | higher time in every pair, beyond control spread |
| auth / cached OAuth access token | 66 | 70 | 7.7% | 7.7% | 7.3% | 2.6% | higher time in every pair, beyond control spread |
| auth / twenty concurrent forced refreshes | 3324 | 1132 | -66.1% | -67% | -64.9% | 1% | lower time in every pair, beyond control spread |
| app / dispose three services | 419 | 869 | 105.9% | 124% | 97.1% | 15.8% | higher time in every pair, beyond control spread |
| credential / build application-default context | 24 | 14 | -40.9% | -40.2% | -40.9% | 6.5% | lower time in every pair, beyond control spread |
| credential / reuse service-account factory | 1979 | 4753 | 139.7% | 133.2% | 147.9% | 5.3% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 160 | 228 | 42% | 43.4% | 41.1% | 1.2% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 2950 | 1229 | -58.5% | -58.4% | -58.5% | 1.3% | lower time in every pair, beyond control spread |

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
