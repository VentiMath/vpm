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

Recorded 2026-11-01T18:51:12.663Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| messaging / successful response projection | 9 | 17 | 79.4% | 22% | 79.4% | 13.4% | unestablished at this precision |
| messaging / unregistered device response | 9323 | 9566 | 5.8% | -51.7% | 31.3% | 26.4% | unestablished at this precision |
| messaging / ten mixed response projections | 12049 | 12100 | 0% | -20.8% | 7.3% | 1.3% | unestablished at this precision |
| firestore / project client options | 245 | 184 | -23.1% | -45.1% | 27.5% | 18.1% | unestablished at this precision |
| firestore / cached database client | 13 | 14 | 6.1% | -13.2% | 11.6% | 3.4% | unestablished at this precision |
| firestore / repeat initialized settings | 23 | 16 | -30.8% | -35.1% | 15.9% | 1.7% | unestablished at this precision |
| response / project JSON and consume data | 1072 | 1128 | 5.6% | 2.8% | 37% | 5% | unestablished at this precision |
| response / malformed JSON diagnostic | 10817 | 11820 | 7.4% | -7.8% | 200.3% | 2.2% | unestablished at this precision |
| response / classify empty response | 5365 | 5410 | 1.4% | -10.5% | 13.5% | 28.2% | unestablished at this precision |
| authorization / JSON request and synthetic stream | 4711 | 5055 | 2.9% | 10.7% | 2.9% | 27.6% | unestablished at this precision |
| authorization / explicit headers and synthetic stream | 3404 | 4482 | 36% | 30.5% | 37% | 48.8% | unestablished at this precision |
| http2 / JSON request and synthetic stream | 3167 | 5354 | 36.1% | 35.6% | 77.4% | 6.2% | higher time in every pair, beyond control spread |
| http2 / twenty requests on a synthetic session | 62678 | 75418 | 29.5% | 4.2% | 51.7% | 3.9% | unestablished at this precision |
| http2 / create and close synthetic batch session | 137 | 160 | 17.4% | 9.3% | 25.2% | 5.6% | unestablished at this precision |
| retry / construct owned default policy | 18 | 12 | -32.1% | -36% | 26.6% | 1.2% | unestablished at this precision |
| retry / construct custom policy | 13 | 161 | 1146.8% | 995.4% | 1275.2% | 0.9% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 11 | 39 | 268.9% | 313.4% | 268.9% | 233% | unestablished at this precision |
| retry / Retry-After seconds | 10 | 79 | 699.9% | 699.6% | 743.8% | 1.3% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 322 | 568 | 75.5% | 67.1% | 85.5% | 0.8% | higher time in every pair, beyond control spread |
| auth / cached certificate snapshot | 84 | 113 | 33.7% | 33.3% | 33.7% | 3.5% | higher time in every pair, beyond control spread |
| auth / no-kid RSA verification with cached key | 101745 | 65367 | -37.3% | -39.2% | -33.7% | 2.7% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 53298 | 30926 | -42% | -51% | -38% | 12.2% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 59500 | 34238 | -41.1% | -31.4% | -41.1% | 3.4% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 70959 | 42040 | -40.8% | -25.7% | -40.8% | 15.2% | unestablished at this precision |
| auth / decode ID token | 3784 | 2622 | -30.3% | -37.5% | 10.8% | 1.8% | unestablished at this precision |
| auth / project a user response | 5652 | 6345 | 14.8% | 9.9% | 18.1% | 2% | unestablished at this precision |
| auth / serialize a user record | 391 | 252 | -36.2% | -54.5% | -35% | 3.2% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 6114 | 6418 | 3.6% | -35.3% | 10.8% | 2.6% | unestablished at this precision |
| auth / delete 100 users with synthetic transport | 13149 | 12523 | -3.4% | -9.1% | 14.1% | 3.5% | unestablished at this precision |
| auth / get user through request dispatch | 6396 | 6870 | 7.2% | 43.3% | 7.2% | 53% | unestablished at this precision |
| auth / update disabled through request dispatch | 8464 | 9282 | 11% | 27.6% | 3.1% | 4.6% | unestablished at this precision |
| http / JSON request with synthetic response stream | 3641 | 3355 | 4.1% | 0.5% | 4.1% | 46% | unestablished at this precision |
| http / JSON request with headers and synthetic stream | 2901 | 3856 | 35.2% | 7.2% | 35.2% | 9% | unestablished at this precision |
| messaging / retained copy and validation helper | 2104 | 1765 | -16.3% | -24.9% | 81.7% | 9.8% | unestablished at this precision |
| app / create context and read project | 314 | 398 | 26.6% | 29.1% | 26.6% | 42.3% | unestablished at this precision |
| app / repeat initialization with equal options | 809 | 1067 | 30.2% | 29.1% | 30.2% | 2.6% | higher time in every pair, beyond control spread |
| app / cached service lookup | 19 | 26 | 29.1% | 1.1% | 108.2% | 31.5% | unestablished at this precision |
| auth / cached OAuth access token | 114 | 110 | -4.5% | -2.4% | -16.6% | 6.7% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 7494 | 3129 | -57.9% | 244.8% | -58.2% | 2.2% | unestablished at this precision |
| app / dispose three services | 579 | 1425 | 148.8% | 149.5% | 147.9% | 20.7% | higher time in every pair, beyond control spread |
| credential / build application-default context | 27 | 29 | 7% | 9.4% | 5.7% | 0.4% | higher time in every pair, beyond control spread |
| credential / reuse service-account factory | 4892 | 5494 | 10.4% | 10.4% | 220.3% | 20.1% | unestablished at this precision |
| credential / acquire cached Google client token | 215 | 434 | 99.3% | 102.6% | 87.5% | 35.9% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 4751 | 2315 | -51.7% | -51.4% | -57.7% | 33.9% | lower time in every pair, beyond control spread |
| messaging / single send with synthetic dispatch | 2235 | 2437 | 3.6% | 16.7% | -6.4% | 16.7% | unestablished at this precision |
| messaging / three-recipient HTTP2 multicast plan | 5703 | 5226 | -9.7% | 46.1% | -15.3% | 282.2% | unestablished at this precision |
| messaging / hundred-recipient HTTP2 multicast plan | 124306 | 125060 | 0.8% | 0.3% | 2.1% | 1.2% | unestablished at this precision |
| messaging / HTTP1 batch with local validation failure | 7617 | 7944 | 2% | -0.1% | 10.9% | 9% | unestablished at this precision |
| storage / construct service-account context | 2785 | 3169 | 13.4% | -7.9% | 54.9% | 33.7% | unestablished at this precision |
| storage / construct application-default context | 4904 | 2590 | -43.4% | -49.3% | 29.5% | 19% | unestablished at this precision |
| storage / default bucket handle | 12010 | 15162 | 26.7% | 26.7% | 22% | 5.8% | unestablished at this precision |
| storage / explicit bucket handle | 12665 | 13919 | 7.9% | -4% | 28.5% | 11.1% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T18:55:24.796Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| messaging / successful response projection | 5 | 13 | 145% | 140.1% | 145.9% | 4.6% | higher time in every pair, beyond control spread |
| messaging / unregistered device response | 636 | 551 | -11.5% | -12% | -8.9% | 7.2% | unestablished at this precision |
| messaging / ten mixed response projections | 915 | 861 | -5.7% | -7.6% | 4.7% | 2.9% | unestablished at this precision |
| firestore / project client options | 121 | 109 | -8.3% | -33% | 3% | 1.1% | unestablished at this precision |
| firestore / cached database client | 10 | 12 | 20.1% | 20.1% | 29.6% | 1.3% | higher time in every pair, beyond control spread |
| firestore / repeat initialized settings | 27 | 14 | -48.4% | -60.1% | -0.6% | 0.7% | unestablished at this precision |
| response / project JSON and consume data | 738 | 958 | 28.6% | 35.1% | 27.4% | 1.1% | higher time in every pair, beyond control spread |
| response / malformed JSON diagnostic | 1218 | 1232 | 2% | -2.8% | 18.5% | 2.6% | unestablished at this precision |
| response / classify empty response | 541 | 557 | 2.2% | 2.2% | 35.5% | 7.5% | unestablished at this precision |
| authorization / JSON request and synthetic stream | 2642 | 4306 | 69.4% | 60.2% | 92.3% | 1.7% | higher time in every pair, beyond control spread |
| authorization / explicit headers and synthetic stream | 2716 | 4319 | 58.9% | 54.2% | 71% | 3.9% | higher time in every pair, beyond control spread |
| http2 / JSON request and synthetic stream | 3057 | 4641 | 48.5% | 48.5% | 38.3% | 7.2% | higher time in every pair, beyond control spread |
| http2 / twenty requests on a synthetic session | 54202 | 75835 | 45.3% | 145.3% | 45.3% | 2.7% | higher time in every pair, beyond control spread |
| http2 / create and close synthetic batch session | 78 | 81 | -0.5% | 8.6% | -0.5% | 61.1% | unestablished at this precision |
| retry / construct owned default policy | 21 | 12 | -44.9% | -45.3% | -44.9% | 51.2% | unestablished at this precision |
| retry / construct custom policy | 14 | 451 | 3211.6% | 4746.7% | 3126.5% | 8.7% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 11 | 59 | 692.1% | 414.5% | 825.8% | 97.9% | higher time in every pair, beyond control spread |
| retry / Retry-After seconds | 17 | 120 | 639.8% | 544.7% | 1461.9% | 3.5% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 56 | 509 | 837.8% | 1377.7% | 658.2% | 5.1% | higher time in every pair, beyond control spread |
| auth / cached certificate snapshot | 52 | 62 | 18.2% | 12.8% | 18.2% | 3.6% | unestablished at this precision |
| auth / no-kid RSA verification with cached key | 43287 | 37102 | -14.4% | 34.1% | -14.4% | 2.7% | unestablished at this precision |
| auth / verify RS256 ID token signature | 27608 | 23111 | -16.5% | -12.8% | -16.5% | 0.5% | unestablished at this precision |
| auth / verify ID token with cached test key | 32094 | 24677 | -23% | 40.7% | -24.2% | 0.8% | unestablished at this precision |
| auth / verify ID token and synthetic revocation lookup | 35931 | 29163 | -22.8% | -11.9% | -23.6% | 2.8% | unestablished at this precision |
| auth / decode ID token | 2647 | 1774 | -33.7% | -33.7% | -32.9% | 4.3% | lower time in every pair, beyond control spread |
| auth / project a user response | 1390 | 1658 | 19.4% | 24.7% | 17.6% | 3.5% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 601 | 333 | -44.4% | -51.1% | -44.4% | 6.7% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 1965 | 2166 | 10.2% | 12.3% | 10.2% | 3.4% | higher time in every pair, beyond control spread |
| auth / delete 100 users with synthetic transport | 1774 | 1592 | -8.7% | 10.2% | -8.7% | 5.1% | unestablished at this precision |
| auth / get user through request dispatch | 2541 | 2768 | 11.6% | 15.7% | 3.4% | 4.7% | unestablished at this precision |
| auth / update disabled through request dispatch | 4002 | 3756 | -5.4% | 68.9% | -8.4% | 5.7% | unestablished at this precision |
| http / JSON request with synthetic response stream | 2777 | 3592 | 29.9% | 52.6% | 29.9% | 3.4% | higher time in every pair, beyond control spread |
| http / JSON request with headers and synthetic stream | 2912 | 4127 | 47.9% | 56.1% | 47.9% | 3.1% | higher time in every pair, beyond control spread |
| messaging / retained copy and validation helper | 2595 | 661 | -74.5% | -74.1% | -74.5% | 49.5% | lower time in every pair, beyond control spread |
| app / create context and read project | 447 | 238 | -46% | -43.8% | -46% | 46.1% | unestablished at this precision |
| app / repeat initialization with equal options | 878 | 1081 | 26.5% | 106.8% | -14.4% | 63.9% | unestablished at this precision |
| app / cached service lookup | 18 | 21 | 15.7% | 31% | 12.8% | 1.6% | higher time in every pair, beyond control spread |
| auth / cached OAuth access token | 81 | 92 | 14% | 37.9% | 7.2% | 13.1% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 3966 | 1356 | -65.8% | -61.4% | -65.8% | 1.7% | lower time in every pair, beyond control spread |
| app / dispose three services | 538 | 1078 | 98.1% | 129.1% | 98.1% | 7.2% | higher time in every pair, beyond control spread |
| credential / build application-default context | 30 | 18 | -40% | -42.8% | -40% | 8.2% | lower time in every pair, beyond control spread |
| credential / reuse service-account factory | 2293 | 5616 | 145.1% | 141.3% | 145.1% | 0.6% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 188 | 271 | 43.7% | 54.6% | 41.2% | 1.2% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3581 | 1488 | -58.4% | -56.3% | -58.4% | 3.6% | lower time in every pair, beyond control spread |
| messaging / single send with synthetic dispatch | 2739 | 1181 | -57.5% | -51.2% | -58.4% | 53.1% | unestablished at this precision |
| messaging / three-recipient HTTP2 multicast plan | 7606 | 2828 | -62.8% | -45.4% | -62.8% | 43.9% | unestablished at this precision |
| messaging / hundred-recipient HTTP2 multicast plan | 169623 | 79642 | -49.7% | -35.4% | -61.2% | 26.9% | lower time in every pair, beyond control spread |
| messaging / HTTP1 batch with local validation failure | 2299 | 1991 | -13% | -5.9% | -25.6% | 8.8% | unestablished at this precision |
| storage / construct service-account context | 4738 | 4119 | -13.1% | -9.4% | -18.2% | 3.8% | lower time in every pair, beyond control spread |
| storage / construct application-default context | 3206 | 2578 | -20% | -19.9% | -21.6% | 4.9% | lower time in every pair, beyond control spread |
| storage / default bucket handle | 12954 | 12638 | -2.1% | -2.1% | 98.7% | 2.9% | unestablished at this precision |
| storage / explicit bucket handle | 12552 | 12741 | -0.6% | -8.1% | 31.7% | 2.1% | unestablished at this precision |

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
