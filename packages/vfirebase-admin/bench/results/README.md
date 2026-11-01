# vfirebase-admin measurements

These recordings precede the independent Storage hash-stream implementation.
Their retained source hashes describe that earlier tree, not the current
transitive Storage source. Current hash-stream and transfer measurements are in
[the Storage report](../../../vgoogle-cloud-storage/bench/results/README.md).
Re-record this report before attributing an end-to-end change to that rewrite.

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

Recorded 2026-11-01T19:47:43.624Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| messaging / successful response projection | 8 | 16 | 92.8% | 106.2% | 79.4% | 7.9% | higher time in every pair, beyond control spread |
| messaging / unregistered device response | 8925 | 8473 | -2.3% | -26.7% | 23.1% | 27.7% | unestablished at this precision |
| messaging / ten mixed response projections | 12020 | 10282 | -13.8% | -23% | -5% | 2.4% | lower time in every pair, beyond control spread |
| firestore / project client options | 213 | 172 | -19.6% | -19.5% | -19.6% | 88.2% | unestablished at this precision |
| firestore / cached database client | 13 | 14 | 6.7% | 5.8% | 6.7% | 0.8% | higher time in every pair, beyond control spread |
| firestore / repeat initialized settings | 22 | 16 | -28.3% | -30.3% | -27.1% | 0.1% | lower time in every pair, beyond control spread |
| response / project JSON and consume data | 1078 | 1118 | 4.4% | 3.5% | 4.4% | 1% | unestablished at this precision |
| response / malformed JSON diagnostic | 10566 | 11437 | 7.7% | 7.7% | -0.9% | 2.1% | unestablished at this precision |
| response / classify empty response | 5055 | 5312 | 5.1% | 6.9% | 4.6% | 2.9% | higher time in every pair, beyond control spread |
| authorization / JSON request and synthetic stream | 3872 | 3968 | -0.6% | -19.1% | 6.4% | 9.1% | unestablished at this precision |
| authorization / explicit headers and synthetic stream | 3181 | 4186 | 37.1% | 37.2% | 37.1% | 4.8% | higher time in every pair, beyond control spread |
| http2 / JSON request and synthetic stream | 3107 | 3984 | 29.1% | 39.9% | 27.6% | 8.8% | higher time in every pair, beyond control spread |
| http2 / twenty requests on a synthetic session | 56604 | 66893 | 16.9% | 18.6% | 16.4% | 4.6% | higher time in every pair, beyond control spread |
| http2 / create and close synthetic batch session | 128 | 191 | 45.1% | 43.6% | 45.1% | 2.1% | higher time in every pair, beyond control spread |
| retry / construct owned default policy | 18 | 12 | -34.3% | -36% | -34.1% | 3.7% | lower time in every pair, beyond control spread |
| retry / construct custom policy | 13 | 136 | 927.2% | 927.2% | 781.4% | 1% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 10 | 31 | 201.5% | 199.6% | 203.7% | 0.3% | higher time in every pair, beyond control spread |
| retry / Retry-After seconds | 10 | 74 | 665.3% | 631.7% | 677% | 0.8% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 290 | 554 | 91.2% | 93.1% | 90.3% | 28.9% | higher time in every pair, beyond control spread |
| auth / cached certificate snapshot | 83 | 101 | 24.7% | 29.2% | 18.4% | 0.9% | higher time in every pair, beyond control spread |
| auth / no-kid RSA verification with cached key | 96239 | 61322 | -35.9% | -35.4% | -37% | 11.2% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 53235 | 28080 | -47.7% | -46.4% | -64% | 0.5% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 58671 | 33331 | -43.4% | -42.6% | -43.5% | 1.1% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 64700 | 41342 | -36.3% | -38.9% | -35.8% | 3.3% | lower time in every pair, beyond control spread |
| auth / decode ID token | 3309 | 2404 | -27.3% | -26.1% | -27.9% | 0.7% | lower time in every pair, beyond control spread |
| auth / project a user response | 5162 | 5463 | 5.1% | 5.1% | 3.2% | 3.8% | unestablished at this precision |
| auth / serialize a user record | 384 | 251 | -34.6% | -32.7% | -34.9% | 3.6% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 5810 | 6279 | 7.6% | 7.8% | 5.4% | 4.7% | unestablished at this precision |
| auth / delete 100 users with synthetic transport | 12138 | 12187 | -0.5% | -0.7% | 3% | 2.8% | unestablished at this precision |
| auth / get user through request dispatch | 6278 | 6405 | 0.2% | 0.2% | -8.3% | 1.3% | unestablished at this precision |
| auth / update disabled through request dispatch | 8374 | 7852 | -6.1% | -6.2% | -6.1% | 0.9% | lower time in every pair, beyond control spread |
| http / JSON request with synthetic response stream | 2952 | 3155 | 8.5% | 5.7% | 8.5% | 3.8% | unestablished at this precision |
| http / JSON request with headers and synthetic stream | 2870 | 3523 | 22.5% | 21.4% | 23% | 3.7% | higher time in every pair, beyond control spread |
| messaging / retained copy and validation helper | 2074 | 1693 | -18.3% | -18.3% | -36.9% | 0.9% | lower time in every pair, beyond control spread |
| app / create context and read project | 299 | 392 | 31.1% | 31.1% | 108.5% | 21.2% | higher time in every pair, beyond control spread |
| app / repeat initialization with equal options | 803 | 1003 | 23.9% | 21.6% | 147.1% | 3.6% | higher time in every pair, beyond control spread |
| app / cached service lookup | 19 | 19 | 0.6% | -7% | 9.1% | 0.8% | unestablished at this precision |
| auth / cached OAuth access token | 108 | 109 | 1.1% | 6.5% | -0.8% | 2% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 7485 | 2320 | -68.7% | -69.8% | -68.2% | 1.5% | lower time in every pair, beyond control spread |
| app / dispose three services | 570 | 1377 | 142.2% | 142.2% | 135.4% | 0.9% | higher time in every pair, beyond control spread |
| credential / build application-default context | 27 | 29 | 6.7% | 8.5% | 2% | 8.3% | unestablished at this precision |
| credential / reuse service-account factory | 4857 | 4916 | 0.7% | 0.7% | 1% | 0.5% | unestablished at this precision |
| credential / acquire cached Google client token | 219 | 430 | 95.9% | 91.9% | 95.9% | 1.8% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 4754 | 2294 | -51.8% | -51.7% | -51.8% | 0.5% | lower time in every pair, beyond control spread |
| messaging / single send with synthetic dispatch | 2196 | 2278 | 3.5% | 3.5% | 3.1% | 1.1% | unestablished at this precision |
| messaging / three-recipient HTTP2 multicast plan | 5433 | 4841 | -9.8% | -10.3% | -7.3% | 5.4% | unestablished at this precision |
| messaging / hundred-recipient HTTP2 multicast plan | 124166 | 114994 | -6.8% | -6.8% | -6.3% | 1.1% | lower time in every pair, beyond control spread |
| messaging / HTTP1 batch with local validation failure | 7421 | 7604 | 1.9% | 3.6% | 0.3% | 3.5% | unestablished at this precision |
| storage / construct service-account context | 4406 | 3986 | -9.7% | -33.1% | 46.3% | 65% | unestablished at this precision |
| storage / construct application-default context | 4584 | 2544 | -45% | -45.9% | -45% | 1.8% | lower time in every pair, beyond control spread |
| storage / default bucket handle | 12044 | 12432 | 3.2% | 2.8% | 5.6% | 12.6% | unestablished at this precision |
| storage / explicit bucket handle | 12053 | 11988 | -0.2% | 0.6% | -2.2% | 2.6% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T19:51:30.350Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| messaging / successful response projection | 5 | 13 | 154.8% | 154.8% | 153.6% | 2.9% | higher time in every pair, beyond control spread |
| messaging / unregistered device response | 631 | 566 | -10.2% | -16.1% | -6.4% | 9.1% | unestablished at this precision |
| messaging / ten mixed response projections | 907 | 857 | -5.6% | -7.7% | -2.3% | 14% | unestablished at this precision |
| firestore / project client options | 124 | 111 | -7.6% | -13.7% | -1.7% | 4.3% | unestablished at this precision |
| firestore / cached database client | 10 | 12 | 18.5% | 15.2% | 19.2% | 2.3% | higher time in every pair, beyond control spread |
| firestore / repeat initialized settings | 27 | 14 | -38.8% | -59.3% | -2.7% | 0.8% | unestablished at this precision |
| response / project JSON and consume data | 716 | 794 | 10.3% | 10.3% | 9.7% | 4.9% | higher time in every pair, beyond control spread |
| response / malformed JSON diagnostic | 1241 | 1199 | -3.3% | 2% | -3.3% | 2.7% | unestablished at this precision |
| response / classify empty response | 534 | 549 | 2.9% | 2.1% | 28% | 1.9% | unestablished at this precision |
| authorization / JSON request and synthetic stream | 2512 | 3725 | 44% | 42.5% | 48.3% | 2.8% | higher time in every pair, beyond control spread |
| authorization / explicit headers and synthetic stream | 2706 | 4030 | 48.8% | 54.4% | 45.2% | 5.7% | higher time in every pair, beyond control spread |
| http2 / JSON request and synthetic stream | 2829 | 4482 | 53.7% | 42.3% | 64.3% | 5.4% | higher time in every pair, beyond control spread |
| http2 / twenty requests on a synthetic session | 50507 | 72082 | 42.2% | 27.6% | 52.3% | 1.4% | higher time in every pair, beyond control spread |
| http2 / create and close synthetic batch session | 75 | 75 | -0.7% | -3.2% | 1.1% | 1.1% | unestablished at this precision |
| retry / construct owned default policy | 21 | 12 | -45.8% | -45.8% | -61.7% | 6.4% | lower time in every pair, beyond control spread |
| retry / construct custom policy | 14 | 434 | 3000.9% | 2801.6% | 3204.3% | 4.1% | higher time in every pair, beyond control spread |
| retry / eligible status and backoff | 11 | 58 | 545.6% | 283.2% | 826% | 2.6% | higher time in every pair, beyond control spread |
| retry / Retry-After seconds | 16 | 92 | 472% | 439.1% | 506.9% | 2.9% | higher time in every pair, beyond control spread |
| retry / HTTP date parsing | 49 | 514 | 936.9% | 954.1% | 902.1% | 2.7% | higher time in every pair, beyond control spread |
| auth / cached certificate snapshot | 52 | 59 | 14.5% | 18.5% | 10.4% | 4.5% | higher time in every pair, beyond control spread |
| auth / no-kid RSA verification with cached key | 42341 | 24041 | -43.2% | -43.7% | -42.4% | 2.8% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 27933 | 20387 | -27% | -27.5% | -23.2% | 1.7% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 32316 | 24561 | -24% | -23.9% | -24% | 0.5% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 36024 | 27824 | -22.7% | -22.4% | -24.5% | 3.9% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2743 | 1782 | -35.3% | -32.8% | -37.9% | 5% | lower time in every pair, beyond control spread |
| auth / project a user response | 1396 | 1641 | 17.3% | 17.2% | 18.4% | 0.9% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 585 | 329 | -44.2% | -42.6% | -44.2% | 6.9% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 1998 | 2125 | 7% | 38.4% | 7% | 2% | higher time in every pair, beyond control spread |
| auth / delete 100 users with synthetic transport | 1749 | 1590 | -9% | -4.2% | -12.9% | 0.8% | unestablished at this precision |
| auth / get user through request dispatch | 2553 | 2620 | 3.4% | -33.4% | 8.3% | 2.4% | unestablished at this precision |
| auth / update disabled through request dispatch | 4857 | 3649 | -22.3% | -21.8% | -41.2% | 3.6% | lower time in every pair, beyond control spread |
| http / JSON request with synthetic response stream | 2901 | 3253 | 5.7% | 5.7% | 4.7% | 2.5% | unestablished at this precision |
| http / JSON request with headers and synthetic stream | 2984 | 3789 | 26.8% | 17.3% | 41% | 1.9% | higher time in every pair, beyond control spread |
| messaging / retained copy and validation helper | 2673 | 636 | -76.2% | -65.5% | -76.9% | 91.2% | unestablished at this precision |
| app / create context and read project | 376 | 233 | -37.8% | -18.2% | -37.8% | 111.4% | unestablished at this precision |
| app / repeat initialization with equal options | 664 | 964 | 56.1% | 56.1% | 60.4% | 107.4% | unestablished at this precision |
| app / cached service lookup | 18 | 20 | 15.8% | 4% | 15.8% | 2.5% | unestablished at this precision |
| auth / cached OAuth access token | 76 | 87 | 13.3% | 8.8% | 17.7% | 13.8% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 3962 | 1356 | -65.7% | -67.8% | -64.1% | 2.5% | lower time in every pair, beyond control spread |
| app / dispose three services | 494 | 1028 | 106.3% | 120.5% | 96.3% | 11.7% | higher time in every pair, beyond control spread |
| credential / build application-default context | 30 | 17 | -41.7% | -44.4% | -39.4% | 3.3% | lower time in every pair, beyond control spread |
| credential / reuse service-account factory | 2404 | 5554 | 129.9% | 119.8% | 143.2% | 3.8% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 186 | 275 | 48.1% | 48.1% | 58.9% | 0.5% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3558 | 1497 | -58% | -57.9% | -58% | 2.9% | lower time in every pair, beyond control spread |
| messaging / single send with synthetic dispatch | 2871 | 1197 | -58.3% | -42.4% | -58.3% | 72.8% | unestablished at this precision |
| messaging / three-recipient HTTP2 multicast plan | 4594 | 2934 | -36.6% | -36.6% | -47.9% | 70.8% | unestablished at this precision |
| messaging / hundred-recipient HTTP2 multicast plan | 112931 | 77286 | -31.5% | -28.2% | -46.6% | 71% | unestablished at this precision |
| messaging / HTTP1 batch with local validation failure | 2098 | 1978 | -5.5% | -4.7% | -11% | 73.1% | unestablished at this precision |
| storage / construct service-account context | 4640 | 4051 | -13.2% | -12.7% | -17.2% | 6.5% | lower time in every pair, beyond control spread |
| storage / construct application-default context | 3182 | 2548 | -18.9% | -20.1% | -18.8% | 19% | unestablished at this precision |
| storage / default bucket handle | 12570 | 12418 | -0.9% | -1.3% | -0.8% | 4.6% | unestablished at this precision |
| storage / explicit bucket handle | 12308 | 12151 | -0.9% | -1.8% | -0.9% | 3.1% | unestablished at this precision |

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
