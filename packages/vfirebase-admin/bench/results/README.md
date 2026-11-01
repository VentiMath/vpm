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

Recorded 2026-11-01T17:16:45.654Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| firestore / project client options | 178 | 143 | -18% | -18% | 31.5% | 6.8% | unestablished at this precision |
| firestore / cached database client | 11 | 11 | 1.8% | 12.3% | -2.6% | 10.4% | unestablished at this precision |
| firestore / repeat initialized settings | 18 | 13 | -28.4% | -27.1% | -28.4% | 8.1% | lower time in every pair, beyond control spread |
| response / project JSON and consume data | 900 | 961 | 5.5% | 1.6% | 7.2% | 3.5% | unestablished at this precision |
| response / malformed JSON diagnostic | 8669 | 9536 | 10.2% | 6.9% | 12% | 5.8% | unestablished at this precision |
| response / classify empty response | 4140 | 4549 | 11.5% | 5.1% | 16.6% | 14.9% | unestablished at this precision |
| authorization / JSON request and synthetic stream | 3133 | 3120 | 4% | 17.7% | 4% | 20.2% | unestablished at this precision |
| authorization / explicit headers and synthetic stream | 2649 | 3417 | 28.1% | 37.4% | 28.1% | 4.3% | higher time in every pair, beyond control spread |
| http2 / JSON request and synthetic stream | 2777 | 3498 | 25.2% | 7.2% | 53.1% | 23.4% | unestablished at this precision |
| http2 / twenty requests on a synthetic session | 47023 | 56035 | 19.2% | 14.9% | 19.2% | 8.7% | unestablished at this precision |
| http2 / create and close synthetic batch session | 106 | 226 | 110.3% | 105.9% | 123.7% | 8.3% | higher time in every pair, beyond control spread |
| retry / construct owned default policy | 14 | 9 | -37.7% | -37% | -37.8% | 1% | lower time in every pair, beyond control spread |
| retry / construct custom policy | 10 | 113 | 1050.7% | 1050.6% | 1063.6% | 2.7% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 9 | 26 | 202.6% | 204.9% | 199.2% | 3.8% | higher time in every pair, beyond control spread |
| retry / Retry-After seconds | 8 | 65 | 695.4% | 667.9% | 706% | 1.4% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 241 | 466 | 93.2% | 93.7% | 92.6% | 1.9% | higher time in every pair, beyond control spread |
| auth / cached certificate snapshot | 69 | 83 | 19.1% | 16.8% | 25.5% | 8.5% | higher time in every pair, beyond control spread |
| auth / no-kid RSA verification with cached key | 79118 | 50763 | -36.3% | -36.3% | -34.8% | 1.4% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 42931 | 23109 | -46.4% | -45.9% | -46.4% | 8.5% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 47061 | 27832 | -41.1% | -41.3% | -41.1% | 17.9% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 52976 | 35119 | -34.1% | -33.8% | -34.1% | 10.2% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2787 | 2025 | -26.7% | -26.7% | -27.3% | 3.8% | lower time in every pair, beyond control spread |
| auth / project a user response | 4286 | 4559 | 8.1% | 9.1% | 5.1% | 5.7% | unestablished at this precision |
| auth / serialize a user record | 320 | 214 | -33.3% | -33.9% | -31.2% | 4.4% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 4840 | 5345 | 10.2% | 9.7% | 10.7% | 5.4% | higher time in every pair, beyond control spread |
| auth / delete 100 users with synthetic transport | 10175 | 10137 | -0.6% | -0.6% | -2.5% | 8.5% | unestablished at this precision |
| auth / get user through request dispatch | 5191 | 5328 | 2.6% | 2% | 4.7% | 6.9% | unestablished at this precision |
| auth / update disabled through request dispatch | 6939 | 6521 | -5.3% | -5.3% | -5.7% | 5% | unestablished at this precision |
| http / JSON request with synthetic response stream | 2760 | 2605 | -0.1% | -9% | 4.7% | 42.1% | unestablished at this precision |
| http / JSON request with headers and synthetic stream | 2468 | 2814 | 13.7% | 15.3% | 1% | 2% | unestablished at this precision |
| messaging / copy and validate a message | 1730 | 1424 | -17.7% | -15.8% | -18.9% | 2.2% | lower time in every pair, beyond control spread |
| app / create context and read project | 246 | 326 | 32.6% | 32.3% | 32.6% | 2.5% | higher time in every pair, beyond control spread |
| app / repeat initialization with equal options | 675 | 829 | 23.6% | 24.2% | 22.9% | 2.7% | higher time in every pair, beyond control spread |
| app / cached service lookup | 16 | 15 | -7.6% | -10% | -7.4% | 68.8% | unestablished at this precision |
| auth / cached OAuth access token | 91 | 90 | -1.1% | -2.5% | 0% | 11% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 6230 | 1934 | -68.8% | -69.1% | -68.5% | 5% | lower time in every pair, beyond control spread |
| app / dispose three services | 484 | 1148 | 136.8% | 134.6% | 140.9% | 3% | higher time in every pair, beyond control spread |
| credential / build application-default context | 23 | 24 | 7.7% | 7.7% | 6.7% | 13.2% | unestablished at this precision |
| credential / reuse service-account factory | 4056 | 4123 | 1.2% | 4.6% | 0.7% | 7.1% | unestablished at this precision |
| credential / acquire cached Google client token | 180 | 355 | 98.1% | 98.8% | 95.2% | 1.5% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3979 | 1921 | -51.7% | -51.3% | -51.9% | 1.3% | lower time in every pair, beyond control spread |
| storage / construct service-account context | 3880 | 4104 | 6.6% | 43.8% | 5.8% | 75.9% | unestablished at this precision |
| storage / construct application-default context | 3807 | 2115 | -44.8% | -44.8% | -43.6% | 2.9% | lower time in every pair, beyond control spread |
| storage / default bucket handle | 10005 | 10332 | 3.3% | 4.7% | 2.7% | 2.1% | higher time in every pair, beyond control spread |
| storage / explicit bucket handle | 10085 | 9995 | 0.1% | -2% | 0.4% | 2% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T17:20:02.832Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| firestore / project client options | 76 | 80 | 6.4% | 10.9% | -3.3% | 4.9% | unestablished at this precision |
| firestore / cached database client | 9 | 10 | 17.7% | 20% | 16.4% | 2.1% | higher time in every pair, beyond control spread |
| firestore / repeat initialized settings | 17 | 9 | -47% | -45.3% | -48.1% | 1.2% | lower time in every pair, beyond control spread |
| response / project JSON and consume data | 613 | 644 | 6.6% | 134.9% | 3.6% | 12.5% | unestablished at this precision |
| response / malformed JSON diagnostic | 1050 | 1022 | -1.5% | 13.8% | -4.7% | 17.4% | unestablished at this precision |
| response / classify empty response | 467 | 454 | -2.7% | -1.1% | -3.6% | 17.8% | unestablished at this precision |
| authorization / JSON request and synthetic stream | 2379 | 3293 | 38.4% | 43.7% | 32.9% | 4.2% | higher time in every pair, beyond control spread |
| authorization / explicit headers and synthetic stream | 2292 | 3537 | 56.3% | 52.9% | 59.3% | 4.1% | higher time in every pair, beyond control spread |
| http2 / JSON request and synthetic stream | 2676 | 3690 | 40.5% | 40.5% | 38.3% | 4.7% | higher time in every pair, beyond control spread |
| http2 / twenty requests on a synthetic session | 45946 | 63005 | 38.5% | 38.5% | 37.6% | 1.9% | higher time in every pair, beyond control spread |
| http2 / create and close synthetic batch session | 64 | 64 | -0.7% | 2.9% | -2.7% | 9.4% | unestablished at this precision |
| retry / construct owned default policy | 18 | 7 | -63.8% | -63.4% | -64% | 12.8% | lower time in every pair, beyond control spread |
| retry / construct custom policy | 12 | 374 | 3038.3% | 3038.3% | 3019.4% | 8.8% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 13 | 48 | 255.8% | 247.6% | 267% | 4.4% | higher time in every pair, beyond control spread |
| retry / Retry-After seconds | 15 | 76 | 430.9% | 426% | 430.9% | 1.6% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 42 | 432 | 938.7% | 963.8% | 894.2% | 150.1% | higher time in every pair, beyond control spread |
| auth / cached certificate snapshot | 43 | 52 | 15.7% | 15.5% | 17.1% | 6.8% | higher time in every pair, beyond control spread |
| auth / no-kid RSA verification with cached key | 35436 | 20441 | -42.3% | -35.8% | -43.4% | 5.3% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 24163 | 17476 | -27.5% | -27.6% | -27.5% | 7% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 27531 | 20771 | -24.5% | -22.3% | -24.5% | 6.6% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 30348 | 23168 | -24.6% | -20.7% | -25.9% | 15% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2376 | 1580 | -34.7% | -32.1% | -37.7% | 67.9% | unestablished at this precision |
| auth / project a user response | 1220 | 1408 | 13.9% | 22.6% | 13.7% | 79.3% | unestablished at this precision |
| auth / serialize a user record | 509 | 285 | -43.6% | -43.6% | -44.8% | 19% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 1716 | 1805 | 4.1% | 9% | 4.1% | 2.9% | unestablished at this precision |
| auth / delete 100 users with synthetic transport | 1555 | 1369 | -11.2% | -11.2% | -12.2% | 2.8% | lower time in every pair, beyond control spread |
| auth / get user through request dispatch | 2208 | 2247 | 3.3% | 3.3% | 3.3% | 5% | unestablished at this precision |
| auth / update disabled through request dispatch | 3492 | 3150 | -9% | -7.6% | -11.3% | 4.9% | unestablished at this precision |
| http / JSON request with synthetic response stream | 2447 | 3166 | 30.6% | 21.3% | 30.6% | 19.2% | unestablished at this precision |
| http / JSON request with headers and synthetic stream | 2636 | 3390 | 31.2% | 31.2% | 27.6% | 7.8% | higher time in every pair, beyond control spread |
| messaging / copy and validate a message | 2218 | 572 | -63.6% | -52.5% | -74.7% | 0.5% | lower time in every pair, beyond control spread |
| app / create context and read project | 270 | 211 | -14.2% | 4.3% | -37.2% | 81.6% | unestablished at this precision |
| app / repeat initialization with equal options | 381 | 494 | 35.2% | 50% | -4% | 141.2% | unestablished at this precision |
| app / cached service lookup | 15 | 17 | 15.1% | 16.5% | 15.1% | 5.5% | higher time in every pair, beyond control spread |
| auth / cached OAuth access token | 68 | 72 | 7.8% | 2.7% | 12.5% | 10.8% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 3440 | 1123 | -66.5% | -68.3% | -65.1% | 7% | lower time in every pair, beyond control spread |
| app / dispose three services | 446 | 873 | 99.6% | 99.6% | 102.9% | 19.4% | higher time in every pair, beyond control spread |
| credential / build application-default context | 26 | 14 | -45.9% | -47% | -41.5% | 11.3% | lower time in every pair, beyond control spread |
| credential / reuse service-account factory | 2141 | 4912 | 129.5% | 129.5% | 136.3% | 4.7% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 166 | 237 | 43.8% | 42.7% | 47% | 9.8% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3074 | 1265 | -59.5% | -61.7% | -55.3% | 18.6% | lower time in every pair, beyond control spread |
| storage / construct service-account context | 4109 | 3529 | -13.2% | -12.4% | -14.5% | 25.2% | unestablished at this precision |
| storage / construct application-default context | 2733 | 2356 | -16.8% | -17.4% | -16.8% | 76.6% | unestablished at this precision |
| storage / default bucket handle | 10676 | 10620 | 0.2% | 0.2% | 0.2% | 9.8% | unestablished at this precision |
| storage / explicit bucket handle | 10326 | 10799 | 2.9% | -0.1% | 5% | 1.5% | unestablished at this precision |

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
