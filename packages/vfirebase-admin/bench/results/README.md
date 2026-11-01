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

Recorded 2026-11-01T17:51:13.241Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| firestore / project client options | 186 | 142 | -22.9% | -19.4% | -24.3% | 10.7% | lower time in every pair, beyond control spread |
| firestore / cached database client | 12 | 12 | 8.6% | 20.4% | -2.4% | 10.5% | unestablished at this precision |
| firestore / repeat initialized settings | 19 | 14 | -27.4% | -23.8% | -28.8% | 0.6% | lower time in every pair, beyond control spread |
| response / project JSON and consume data | 928 | 999 | 7.7% | -0.1% | 7.7% | 0.3% | unestablished at this precision |
| response / malformed JSON diagnostic | 9069 | 9670 | 7.1% | 3.4% | 10.8% | 4.8% | unestablished at this precision |
| response / classify empty response | 4243 | 4495 | 6.8% | 2% | 9.6% | 2.4% | unestablished at this precision |
| authorization / JSON request and synthetic stream | 3224 | 3246 | -1.1% | -10.6% | 24.3% | 21% | unestablished at this precision |
| authorization / explicit headers and synthetic stream | 2990 | 3340 | 10.2% | -0.9% | 28.5% | 6.4% | unestablished at this precision |
| http2 / JSON request and synthetic stream | 2853 | 3527 | 23.6% | 15.3% | 30.1% | 24.2% | unestablished at this precision |
| http2 / twenty requests on a synthetic session | 51247 | 66002 | 26.3% | 33.4% | 18.6% | 21.1% | unestablished at this precision |
| http2 / create and close synthetic batch session | 112 | 209 | 87.4% | 169.3% | 59.2% | 10.3% | higher time in every pair, beyond control spread |
| retry / construct owned default policy | 15 | 9 | -39% | -38.2% | -39% | 3.6% | lower time in every pair, beyond control spread |
| retry / construct custom policy | 10 | 119 | 1065.7% | 1053.3% | 1105.1% | 13.2% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 9 | 27 | 203.4% | 204.1% | 201.9% | 1.2% | higher time in every pair, beyond control spread |
| retry / Retry-After seconds | 8 | 65 | 675.8% | 664.1% | 721.9% | 25.1% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 249 | 492 | 95.9% | 98.1% | 93.8% | 64.8% | higher time in every pair, beyond control spread |
| auth / cached certificate snapshot | 71 | 83 | 16.5% | 16.5% | 20.4% | 89.9% | unestablished at this precision |
| auth / no-kid RSA verification with cached key | 83148 | 53946 | -35.4% | -35.4% | -33.4% | 40.8% | unestablished at this precision |
| auth / verify RS256 ID token signature | 44508 | 25061 | -43.7% | -43.7% | -31.5% | 25.3% | unestablished at this precision |
| auth / verify ID token with cached test key | 48364 | 34250 | -31% | -39.8% | -15.2% | 8% | unestablished at this precision |
| auth / verify ID token and synthetic revocation lookup | 55724 | 36190 | -35.5% | -35.5% | -36.7% | 18.6% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2811 | 2064 | -26.7% | -26% | -26.8% | 1.8% | lower time in every pair, beyond control spread |
| auth / project a user response | 4388 | 4616 | 5.5% | 85.4% | 4.5% | 1.6% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 324 | 215 | -33.8% | -19.7% | -33.8% | 1.4% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 4931 | 5353 | 9% | 10.9% | 7.3% | 3.3% | higher time in every pair, beyond control spread |
| auth / delete 100 users with synthetic transport | 10525 | 10565 | 1% | 1.1% | -1.4% | 1.1% | unestablished at this precision |
| auth / get user through request dispatch | 5498 | 5683 | 5.9% | 26.2% | -6.9% | 1.6% | unestablished at this precision |
| auth / update disabled through request dispatch | 7175 | 6693 | -5.9% | -3.3% | -5.9% | 3.9% | unestablished at this precision |
| http / JSON request with synthetic response stream | 2555 | 2703 | 3.7% | -11.9% | 3.7% | 8.8% | unestablished at this precision |
| http / JSON request with headers and synthetic stream | 2528 | 2921 | 15.6% | 15.6% | 7.8% | 25.4% | unestablished at this precision |
| messaging / retained copy and validation helper | 1766 | 1459 | -18.2% | -18.2% | -17.4% | 2.4% | lower time in every pair, beyond control spread |
| app / create context and read project | 258 | 334 | 29.8% | 24.6% | 30.8% | 6.2% | higher time in every pair, beyond control spread |
| app / repeat initialization with equal options | 705 | 864 | 21.2% | 20.7% | 23.2% | 52.6% | unestablished at this precision |
| app / cached service lookup | 16 | 16 | -0.8% | -0.4% | -1.3% | 2.1% | unestablished at this precision |
| auth / cached OAuth access token | 92 | 94 | 1.9% | 1.9% | 2.1% | 7.8% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 6452 | 1972 | -69.5% | -73.9% | -66.9% | 5.2% | lower time in every pair, beyond control spread |
| app / dispose three services | 513 | 1217 | 131.9% | 131.9% | 203.6% | 2.9% | higher time in every pair, beyond control spread |
| credential / build application-default context | 24 | 25 | 4.3% | -9% | 9.7% | 9.8% | unestablished at this precision |
| credential / reuse service-account factory | 4168 | 4312 | 3.3% | 3.8% | 3.3% | 1.3% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 187 | 384 | 106.3% | 69.6% | 106.3% | 2.1% | unestablished at this precision |
| credential / twenty concurrent acquisitions | 4099 | 1975 | -51.8% | -51.6% | -52.6% | 1.3% | lower time in every pair, beyond control spread |
| messaging / single send with synthetic dispatch | 1920 | 1953 | 1.8% | 2% | 1.5% | 2.6% | unestablished at this precision |
| messaging / three-recipient HTTP2 multicast plan | 4787 | 4358 | -9.9% | -12.7% | -9% | 8.4% | unestablished at this precision |
| messaging / hundred-recipient HTTP2 multicast plan | 105585 | 100246 | -6.1% | -5% | -6.9% | 0.7% | lower time in every pair, beyond control spread |
| messaging / HTTP1 batch with local validation failure | 6566 | 6611 | 0% | 2% | 0% | 13.7% | unestablished at this precision |
| storage / construct service-account context | 3931 | 3008 | -13.7% | -2.7% | -17.1% | 62.3% | unestablished at this precision |
| storage / construct application-default context | 3968 | 2081 | -47.6% | -49.8% | -38.7% | 64.2% | unestablished at this precision |
| storage / default bucket handle | 10526 | 10804 | 1.9% | -3.8% | 6.6% | 3.1% | unestablished at this precision |
| storage / explicit bucket handle | 10475 | 10400 | -0.7% | -25.7% | -0.7% | 0.7% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T17:54:51.784Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| firestore / project client options | 83 | 84 | 3.3% | 0.2% | 3.3% | 7.1% | unestablished at this precision |
| firestore / cached database client | 9 | 10 | 16.5% | 16.5% | 14.4% | 2.7% | higher time in every pair, beyond control spread |
| firestore / repeat initialized settings | 18 | 9 | -45.9% | -51.9% | -45.2% | 7.6% | lower time in every pair, beyond control spread |
| response / project JSON and consume data | 617 | 692 | 11.2% | 11.2% | 11.3% | 0.4% | higher time in every pair, beyond control spread |
| response / malformed JSON diagnostic | 1056 | 1039 | -0.7% | -2.7% | 0% | 6.1% | unestablished at this precision |
| response / classify empty response | 478 | 463 | -2.8% | -5% | 0.5% | 1.6% | unestablished at this precision |
| authorization / JSON request and synthetic stream | 2496 | 3385 | 35.4% | 35.4% | 35.4% | 49.6% | unestablished at this precision |
| authorization / explicit headers and synthetic stream | 2536 | 4001 | 53.4% | 70.3% | 18.5% | 16.9% | unestablished at this precision |
| http2 / JSON request and synthetic stream | 2999 | 4366 | 35% | 30.8% | 68.3% | 19.6% | higher time in every pair, beyond control spread |
| http2 / twenty requests on a synthetic session | 44783 | 63624 | 43.1% | 34.4% | 121.9% | 14.1% | higher time in every pair, beyond control spread |
| http2 / create and close synthetic batch session | 67 | 74 | 12.8% | 6.4% | 20.9% | 4.5% | unestablished at this precision |
| retry / construct owned default policy | 18 | 4 | -75.6% | -61.6% | -76.2% | 27.2% | lower time in every pair, beyond control spread |
| retry / construct custom policy | 12 | 378 | 2962.5% | 2962.5% | 3019.7% | 5.8% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 14 | 48 | 256.9% | 260.8% | 205.2% | 14.6% | higher time in every pair, beyond control spread |
| retry / Retry-After seconds | 15 | 81 | 439.1% | 446% | 245.9% | 10.7% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 42 | 454 | 945.7% | 934.2% | 994.6% | 24.6% | higher time in every pair, beyond control spread |
| auth / cached certificate snapshot | 44 | 51 | 14% | 13.8% | 15.6% | 28.1% | unestablished at this precision |
| auth / no-kid RSA verification with cached key | 38106 | 21520 | -44.8% | -48.4% | -34.4% | 11.9% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 24125 | 17680 | -26.9% | -38.9% | -22.3% | 56.2% | unestablished at this precision |
| auth / verify ID token with cached test key | 27785 | 21516 | -22.6% | -29.1% | -18.5% | 117.7% | unestablished at this precision |
| auth / verify ID token and synthetic revocation lookup | 31098 | 26199 | -16% | -16.9% | -12.8% | 23.6% | unestablished at this precision |
| auth / decode ID token | 2483 | 1547 | -38.6% | -39.4% | -36.5% | 13.3% | lower time in every pair, beyond control spread |
| auth / project a user response | 1263 | 1493 | 14.9% | -1.5% | 14.9% | 1.4% | unestablished at this precision |
| auth / serialize a user record | 529 | 294 | -45% | -48.8% | -43.9% | 3.3% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 1762 | 1942 | 10.3% | 8.6% | 14.8% | 17.8% | unestablished at this precision |
| auth / delete 100 users with synthetic transport | 1602 | 1538 | -7% | 4.8% | -12.9% | 8.5% | unestablished at this precision |
| auth / get user through request dispatch | 2180 | 2414 | 11.8% | 7.3% | 15.3% | 5.1% | unestablished at this precision |
| auth / update disabled through request dispatch | 3864 | 3216 | -19.3% | -16.2% | -19.3% | 5.1% | lower time in every pair, beyond control spread |
| http / JSON request with synthetic response stream | 2577 | 3292 | 34.1% | 17.1% | 40.5% | 3.7% | unestablished at this precision |
| http / JSON request with headers and synthetic stream | 2570 | 3910 | 58% | 43% | 58.1% | 8.8% | higher time in every pair, beyond control spread |
| messaging / retained copy and validation helper | 1712 | 573 | -64.6% | -64.8% | -58.1% | 52.3% | unestablished at this precision |
| app / create context and read project | 277 | 207 | -14.1% | -16.2% | -3.6% | 97.5% | unestablished at this precision |
| app / repeat initialization with equal options | 537 | 504 | 21.3% | 19.6% | 38.8% | 39.6% | unestablished at this precision |
| app / cached service lookup | 15 | 18 | 23.2% | 22.6% | 27% | 59.2% | unestablished at this precision |
| auth / cached OAuth access token | 71 | 73 | 3.2% | -22% | 14.8% | 32.8% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 3411 | 1172 | -65.7% | -66.9% | -61.2% | 79.4% | unestablished at this precision |
| app / dispose three services | 447 | 905 | 103.1% | 104.8% | 103.1% | 42.8% | higher time in every pair, beyond control spread |
| credential / build application-default context | 26 | 15 | -41.1% | -41.1% | -41.1% | 15.5% | lower time in every pair, beyond control spread |
| credential / reuse service-account factory | 2058 | 5018 | 139.8% | 144.6% | 128.3% | 23.2% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 161 | 243 | 50.4% | 50.4% | 42.2% | 170.4% | unestablished at this precision |
| credential / twenty concurrent acquisitions | 3059 | 1307 | -57.3% | -58.3% | -57.3% | 27.5% | lower time in every pair, beyond control spread |
| messaging / single send with synthetic dispatch | 1814 | 960 | -42.7% | -44.7% | -34.2% | 82% | unestablished at this precision |
| messaging / three-recipient HTTP2 multicast plan | 5057 | 3778 | -9.5% | -23.8% | -6.5% | 5.3% | unestablished at this precision |
| messaging / hundred-recipient HTTP2 multicast plan | 114101 | 92924 | -16.2% | -15.7% | -25.6% | 7.5% | unestablished at this precision |
| messaging / HTTP1 batch with local validation failure | 1907 | 1773 | -7.8% | -7.8% | -8.6% | 5.6% | unestablished at this precision |
| storage / construct service-account context | 4628 | 3646 | -21.9% | -17.9% | -22.1% | 7.5% | lower time in every pair, beyond control spread |
| storage / construct application-default context | 2834 | 2314 | -19.3% | -18.7% | -19.3% | 3.2% | lower time in every pair, beyond control spread |
| storage / default bucket handle | 11379 | 11308 | 2.1% | 2.1% | -3.5% | 4.5% | unestablished at this precision |
| storage / explicit bucket handle | 10954 | 10515 | -4% | -5.1% | -0.7% | 1% | unestablished at this precision |

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
