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

Recorded 2026-11-01T16:37:59.799Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| response / project JSON and consume data | 866 | 915 | 6% | 6% | 5.8% | 1.8% | higher time in every pair, beyond control spread |
| response / malformed JSON diagnostic | 6845 | 7506 | 9.7% | 8.9% | 12.1% | 3.4% | higher time in every pair, beyond control spread |
| response / classify empty response | 4122 | 3972 | -5.1% | -18% | 12.8% | 28.1% | unestablished at this precision |
| authorization / JSON request and synthetic stream | 2507 | 3124 | 23.9% | 23.9% | 53.3% | 85.1% | unestablished at this precision |
| authorization / explicit headers and synthetic stream | 2522 | 3230 | 27.2% | 26.5% | 44.9% | 37.8% | unestablished at this precision |
| http2 / JSON request and synthetic stream | 2793 | 3276 | 17.1% | 13.2% | 26.9% | 26.9% | unestablished at this precision |
| http2 / twenty requests on a synthetic session | 43436 | 55219 | 26.5% | 28.8% | 23.4% | 10.2% | higher time in every pair, beyond control spread |
| http2 / create and close synthetic batch session | 111 | 107 | -4.8% | 23.7% | -6.7% | 13% | unestablished at this precision |
| retry / construct owned default policy | 14 | 9 | -36.5% | -35.7% | -37.4% | 1.1% | lower time in every pair, beyond control spread |
| retry / construct custom policy | 10 | 114 | 1064.4% | 1064.4% | 1067.4% | 1.1% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 9 | 26 | 209.9% | 206.4% | 210% | 3.7% | higher time in every pair, beyond control spread |
| retry / Retry-After seconds | 8 | 63 | 674.6% | 658.4% | 694.3% | 6.7% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 240 | 463 | 94% | 94.2% | 92.6% | 117.2% | unestablished at this precision |
| auth / cached certificate snapshot | 68 | 80 | 17.7% | 15.3% | 22.6% | 15.3% | unestablished at this precision |
| auth / no-kid RSA verification with cached key | 80239 | 50279 | -37.3% | -58% | -37.3% | 17.1% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 43418 | 23391 | -46.1% | -46% | -46.3% | 4.7% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 47251 | 27872 | -41.3% | -41.3% | -41.2% | 5.9% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 54173 | 34157 | -36.6% | -36.9% | -36.3% | 5.8% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2729 | 1965 | -28% | -29.6% | -27.1% | 0.7% | lower time in every pair, beyond control spread |
| auth / project a user response | 4237 | 4512 | 6.3% | -3% | 7.9% | 2.3% | unestablished at this precision |
| auth / serialize a user record | 324 | 212 | -34.7% | -34.6% | -46.4% | 15.5% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 4879 | 5161 | 5.8% | 5.9% | 5.8% | 1.2% | higher time in every pair, beyond control spread |
| auth / delete 100 users with synthetic transport | 10593 | 10235 | -4.8% | -4.8% | -2.7% | 1.7% | unestablished at this precision |
| auth / get user through request dispatch | 5163 | 5295 | 2.1% | 2.1% | 2.1% | 0.5% | unestablished at this precision |
| auth / update disabled through request dispatch | 6887 | 6590 | -5.3% | -3% | -5.3% | 0.8% | unestablished at this precision |
| http / JSON request with synthetic response stream | 2589 | 2531 | 11% | 12.4% | 11% | 22.9% | unestablished at this precision |
| http / JSON request with headers and synthetic stream | 2280 | 2819 | 23.9% | 25.7% | 23.9% | 6.7% | higher time in every pair, beyond control spread |
| messaging / copy and validate a message | 1725 | 1434 | -17.7% | -34.2% | -17.7% | 20% | unestablished at this precision |
| app / create context and read project | 247 | 332 | 32.5% | 32% | 32.5% | 28.6% | unestablished at this precision |
| app / repeat initialization with equal options | 676 | 844 | 25.6% | 20.6% | 28.3% | 13% | higher time in every pair, beyond control spread |
| app / cached service lookup | 16 | 15 | -6.1% | 1.1% | -6.1% | 10.4% | unestablished at this precision |
| auth / cached OAuth access token | 90 | 91 | 0.9% | 1.5% | 0.5% | 1.5% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 6303 | 1965 | -68.8% | -69.2% | -68.4% | 92.6% | unestablished at this precision |
| app / dispose three services | 488 | 1140 | 133.8% | 132.4% | 135.3% | 8.8% | higher time in every pair, beyond control spread |
| credential / build application-default context | 23 | 24 | 7.2% | 7.2% | 22.7% | 7.4% | unestablished at this precision |
| credential / reuse service-account factory | 4066 | 4154 | 1.1% | 10.3% | 0.1% | 1.2% | unestablished at this precision |
| credential / acquire cached Google client token | 181 | 361 | 101.1% | 97.2% | 102.3% | 3.3% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3982 | 1955 | -51% | -51.7% | -48.4% | 1.7% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T16:40:45.554Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| response / project JSON and consume data | 599 | 641 | 7.2% | 9.3% | 7.2% | 1.9% | higher time in every pair, beyond control spread |
| response / malformed JSON diagnostic | 1057 | 1001 | -5.3% | -5% | -5.3% | 5.2% | unestablished at this precision |
| response / classify empty response | 474 | 444 | -5.9% | -5.9% | -5.4% | 5.1% | unestablished at this precision |
| authorization / JSON request and synthetic stream | 2224 | 3160 | 41.1% | 40.8% | 42.1% | 8.1% | higher time in every pair, beyond control spread |
| authorization / explicit headers and synthetic stream | 2241 | 3573 | 60.7% | 171.2% | 56.5% | 6.5% | higher time in every pair, beyond control spread |
| http2 / JSON request and synthetic stream | 2609 | 3736 | 43.2% | 45.4% | 37.6% | 3.3% | higher time in every pair, beyond control spread |
| http2 / twenty requests on a synthetic session | 47325 | 64996 | 37.9% | 37.7% | 37.9% | 2.5% | higher time in every pair, beyond control spread |
| http2 / create and close synthetic batch session | 68 | 67 | -0.3% | 4.2% | -3.8% | 5.1% | unestablished at this precision |
| retry / construct owned default policy | 13 | 4 | -68.6% | -67.2% | -70% | 4% | lower time in every pair, beyond control spread |
| retry / construct custom policy | 11 | 363 | 3284% | 3162.2% | 3489.4% | 95.9% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 14 | 48 | 249% | 244.1% | 249% | 130.6% | higher time in every pair, beyond control spread |
| retry / Retry-After seconds | 15 | 77 | 421.2% | 404.7% | 436.6% | 37.7% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 45 | 440 | 900.5% | 911.6% | 866.9% | 2.8% | higher time in every pair, beyond control spread |
| auth / cached certificate snapshot | 45 | 49 | 11.6% | 6.9% | 14% | 4.3% | unestablished at this precision |
| auth / no-kid RSA verification with cached key | 37148 | 20709 | -43.7% | -44.2% | -43.7% | 15% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 23940 | 17367 | -27.8% | -27.1% | -28.6% | 3.5% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 27495 | 21065 | -24% | -24% | -24.3% | 3.6% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 31060 | 24065 | -22.2% | -20.8% | -23.7% | 4.8% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2388 | 1582 | -35.5% | -30.9% | -37.1% | 1.4% | lower time in every pair, beyond control spread |
| auth / project a user response | 1224 | 1394 | 16% | 13.9% | 16.3% | 2.8% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 517 | 280 | -45.8% | -45.3% | -49.3% | 4.7% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 1721 | 1759 | 2.5% | -2.3% | 7.4% | 3.3% | unestablished at this precision |
| auth / delete 100 users with synthetic transport | 1424 | 1397 | -1.9% | 1.8% | -5.4% | 20.9% | unestablished at this precision |
| auth / get user through request dispatch | 2178 | 2178 | -0.9% | -1.3% | 0.4% | 8.1% | unestablished at this precision |
| auth / update disabled through request dispatch | 3386 | 2949 | -13.2% | -14.8% | -8.3% | 0.5% | lower time in every pair, beyond control spread |
| http / JSON request with synthetic response stream | 2364 | 2868 | 24.5% | 14.6% | 31.6% | 5.2% | higher time in every pair, beyond control spread |
| http / JSON request with headers and synthetic stream | 2444 | 3093 | 26.9% | 40% | 20% | 3.7% | higher time in every pair, beyond control spread |
| messaging / copy and validate a message | 1567 | 555 | -61% | -58.5% | -61% | 5.7% | lower time in every pair, beyond control spread |
| app / create context and read project | 216 | 210 | -4.2% | -13.9% | -0.3% | 24.3% | unestablished at this precision |
| app / repeat initialization with equal options | 336 | 471 | 55.8% | 10.2% | 116% | 23.5% | unestablished at this precision |
| app / cached service lookup | 15 | 17 | 14.5% | 14.8% | 12.7% | 3.9% | higher time in every pair, beyond control spread |
| auth / cached OAuth access token | 68 | 73 | 9% | 9% | 9.1% | 4.9% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 3470 | 1158 | -66.5% | -66.5% | -66.6% | 8.4% | lower time in every pair, beyond control spread |
| app / dispose three services | 422 | 884 | 109.2% | 104.3% | 109.2% | 15.2% | higher time in every pair, beyond control spread |
| credential / build application-default context | 26 | 15 | -41.5% | -56.3% | -41.5% | 30.4% | lower time in every pair, beyond control spread |
| credential / reuse service-account factory | 2160 | 4843 | 128.1% | 96.4% | 138% | 4.5% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 166 | 228 | 38% | 38% | 35.8% | 6.3% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3074 | 1292 | -57.3% | -57.3% | -58.1% | 1% | lower time in every pair, beyond control spread |

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
