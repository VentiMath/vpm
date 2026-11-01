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

Recorded 2026-11-01T14:38:19.718Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / cached certificate snapshot | 64 | 78 | 24.2% | 21.4% | 24.2% | 54.4% | unestablished at this precision |
| auth / no-kid RSA verification with cached key | 76849 | 49563 | -36% | -36.4% | -34.3% | 13.5% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 43390 | 23452 | -46.1% | -45.8% | -46.3% | 19.3% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 47745 | 28328 | -40.7% | -41.7% | -39.7% | 4.9% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 54375 | 35309 | -35.1% | -35.1% | -35.1% | 1.3% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2699 | 1998 | -26.4% | -26.6% | -25.9% | 0.8% | lower time in every pair, beyond control spread |
| auth / project a user response | 4288 | 4602 | 7% | 7.2% | 6.9% | 1.3% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 323 | 211 | -34.7% | -34.8% | -34.7% | 49.1% | unestablished at this precision |
| auth / update disabled with synthetic transport | 4837 | 5243 | 8.1% | 8% | 8.1% | 2.4% | higher time in every pair, beyond control spread |
| auth / delete 100 users with synthetic transport | 8497 | 8331 | -0.9% | -2.3% | -0.7% | 2.1% | unestablished at this precision |
| auth / get user through request dispatch | 5163 | 5283 | 2.1% | 4.1% | 1.8% | 0.8% | unestablished at this precision |
| auth / update disabled through request dispatch | 6890 | 6525 | -5.6% | -5.7% | -5.5% | 1.5% | lower time in every pair, beyond control spread |
| http / JSON request with synthetic response stream | 2809 | 2797 | 3.2% | -10.1% | 14.2% | 13.2% | unestablished at this precision |
| http / JSON request with headers and synthetic stream | 2402 | 2839 | 18.2% | 21.1% | 11.5% | 19.1% | unestablished at this precision |
| messaging / copy and validate a message | 1720 | 1438 | -17.5% | -14.4% | -18.9% | 7.8% | lower time in every pair, beyond control spread |
| app / create context and read project | 253 | 329 | 29.9% | 32.9% | 29.3% | 5.5% | higher time in every pair, beyond control spread |
| app / repeat initialization with equal options | 662 | 829 | 25.8% | 26.6% | 25.8% | 2.3% | higher time in every pair, beyond control spread |
| app / cached service lookup | 16 | 15 | -5.9% | -0.2% | -6.4% | 0.7% | unestablished at this precision |
| auth / cached OAuth access token | 89 | 90 | 0% | -1.8% | 1.9% | 8.4% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 6170 | 1932 | -68.6% | -68.9% | -68.5% | 1.6% | lower time in every pair, beyond control spread |
| app / dispose three services | 478 | 1129 | 139.3% | 139.5% | 136.9% | 3.7% | higher time in every pair, beyond control spread |
| credential / build application-default context | 23 | 24 | 7.2% | 8.2% | -27.4% | 1.4% | unestablished at this precision |
| credential / reuse service-account factory | 4042 | 4055 | 0.4% | 3% | -4.3% | 2% | unestablished at this precision |
| credential / acquire cached Google client token | 181 | 355 | 95.6% | 97.4% | 66.1% | 6.9% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3979 | 1902 | -52.1% | -52% | -52.2% | 9% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T14:40:00.040Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / cached certificate snapshot | 44 | 48 | 9.7% | 9.7% | 12.7% | 5.9% | unestablished at this precision |
| auth / no-kid RSA verification with cached key | 36212 | 20314 | -43.9% | -49.1% | -43.9% | 3.6% | lower time in every pair, beyond control spread |
| auth / verify RS256 ID token signature | 23777 | 17367 | -26.7% | -27.6% | -26.7% | 3.9% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 27512 | 20628 | -24.7% | -28.6% | -24.3% | 4.1% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 30636 | 23416 | -24% | -24% | -22.6% | 2.7% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2395 | 1504 | -37.2% | -39.7% | 42.2% | 18.5% | unestablished at this precision |
| auth / project a user response | 1206 | 1381 | 11.9% | 11.9% | 55.4% | 2.2% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 495 | 270 | -45.5% | -46.2% | -39.9% | 4.8% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 1699 | 1682 | 0.6% | -2.7% | 1.7% | 3% | unestablished at this precision |
| auth / delete 100 users with synthetic transport | 1291 | 1200 | -10.6% | -12.3% | -10.6% | 2.5% | lower time in every pair, beyond control spread |
| auth / get user through request dispatch | 2116 | 2130 | 1.9% | -1.3% | 2.9% | 3.8% | unestablished at this precision |
| auth / update disabled through request dispatch | 3402 | 2976 | -11.8% | -10% | -14.1% | 7% | lower time in every pair, beyond control spread |
| http / JSON request with synthetic response stream | 2152 | 2346 | 8.9% | 9.2% | 6.6% | 9.9% | unestablished at this precision |
| http / JSON request with headers and synthetic stream | 2348 | 2715 | 16.4% | 17.7% | 13.2% | 1.7% | higher time in every pair, beyond control spread |
| messaging / copy and validate a message | 2067 | 594 | -71.3% | -71.5% | -71.3% | 39.1% | lower time in every pair, beyond control spread |
| app / create context and read project | 362 | 217 | -40.2% | -40.2% | -41.2% | 3.5% | lower time in every pair, beyond control spread |
| app / repeat initialization with equal options | 768 | 471 | -39.2% | -40.7% | 1% | 6.2% | unestablished at this precision |
| app / cached service lookup | 13 | 6 | -56.3% | -61% | -54.2% | 29.7% | lower time in every pair, beyond control spread |
| auth / cached OAuth access token | 62 | 67 | 6.5% | 5.8% | 13.7% | 13.3% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 3334 | 1136 | -65.6% | -66.5% | -65.5% | 5.4% | lower time in every pair, beyond control spread |
| app / dispose three services | 459 | 883 | 95.4% | 94.1% | 96.5% | 8% | higher time in every pair, beyond control spread |
| credential / build application-default context | 22 | 12 | -43.6% | -43.6% | -44.3% | 1.4% | lower time in every pair, beyond control spread |
| credential / reuse service-account factory | 2035 | 4818 | 136.7% | 136.7% | 133.6% | 2.4% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 155 | 225 | 46.5% | 42.2% | 48.1% | 6.9% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 2981 | 1260 | -57.3% | -58% | -55% | 1.8% | lower time in every pair, beyond control spread |

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
