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

Recorded 2026-11-01T13:33:14.879Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / verify RS256 ID token signature | 45682 | 24104 | -47.1% | -47.1% | -47.2% | 4% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 48622 | 28981 | -40.8% | -40.8% | -40.4% | 1.7% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 56434 | 36016 | -34.9% | -34.9% | -37% | 13% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2807 | 2115 | -24.4% | -23.3% | -24.4% | 0.2% | lower time in every pair, beyond control spread |
| auth / project a user response | 4472 | 4950 | 10.5% | 10.4% | 115.4% | 1.3% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 333 | 222 | -33.4% | -33.4% | -30.5% | 3.3% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 5089 | 5452 | 6.9% | 5% | 10.5% | 2.4% | higher time in every pair, beyond control spread |
| auth / delete 100 users with synthetic transport | 8757 | 8614 | -2.6% | -3.6% | 1.4% | 3.8% | unestablished at this precision |
| messaging / copy and validate a message | 1747 | 1494 | -12.7% | -14% | -12.7% | 0.8% | lower time in every pair, beyond control spread |
| app / create context and read project | 254 | 340 | 33.9% | 31.2% | 37.4% | 1% | higher time in every pair, beyond control spread |
| app / repeat initialization with equal options | 693 | 857 | 23.2% | 23.6% | 23.1% | 66.6% | unestablished at this precision |
| app / cached service lookup | 17 | 16 | -4.5% | -1.9% | -4.5% | 1% | unestablished at this precision |
| auth / cached OAuth access token | 93 | 94 | 0.2% | 0.1% | 4.7% | 18.6% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 6641 | 2050 | -69.3% | -69.3% | -68.4% | 4.4% | lower time in every pair, beyond control spread |
| app / dispose three services | 511 | 1236 | 141.6% | 137.5% | 147.1% | 1% | higher time in every pair, beyond control spread |
| credential / build application-default context | 23 | 25 | 10% | 8.3% | 10% | 1.2% | higher time in every pair, beyond control spread |
| credential / reuse service-account factory | 4211 | 4373 | 2.1% | -0.4% | 4% | 4.9% | unestablished at this precision |
| credential / acquire cached Google client token | 190 | 367 | 92.7% | 94.9% | 92.2% | 1.2% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 4213 | 2005 | -52% | -52% | -52.6% | 4% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T13:34:31.932Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / verify RS256 ID token signature | 23658 | 17258 | -27.9% | -27.3% | -28.2% | 1.1% | lower time in every pair, beyond control spread |
| auth / verify ID token with cached test key | 27660 | 20796 | -24.8% | -21.5% | -26.8% | 1.2% | lower time in every pair, beyond control spread |
| auth / verify ID token and synthetic revocation lookup | 30496 | 23351 | -22.6% | -21.7% | -23.7% | 0.4% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2323 | 1497 | -36.2% | -36.2% | -35.3% | 6.2% | lower time in every pair, beyond control spread |
| auth / project a user response | 1197 | 1324 | 10.2% | 12.5% | 8.3% | 3% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 503 | 269 | -46.8% | -45.4% | -47.1% | 1.3% | lower time in every pair, beyond control spread |
| auth / update disabled with synthetic transport | 1708 | 1703 | -0.5% | 1.2% | -1% | 1.3% | unestablished at this precision |
| auth / delete 100 users with synthetic transport | 1288 | 1206 | -5.5% | -5.5% | -8.2% | 5% | unestablished at this precision |
| messaging / copy and validate a message | 2058 | 680 | -67.1% | -66.7% | -68% | 0.6% | lower time in every pair, beyond control spread |
| app / create context and read project | 298 | 254 | -12.1% | -27% | 9.6% | 8.9% | unestablished at this precision |
| app / repeat initialization with equal options | 578 | 542 | 2.1% | -29.7% | 82.1% | 11.4% | unestablished at this precision |
| app / cached service lookup | 14 | 21 | 49.5% | 55.2% | 10.8% | 8.7% | unestablished at this precision |
| auth / cached OAuth access token | 69 | 70 | 6% | 6.3% | 5.6% | 4.7% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 3332 | 1327 | -60.1% | -60.5% | -60.1% | 56.6% | lower time in every pair, beyond control spread |
| app / dispose three services | 459 | 1031 | 127% | 118.5% | 134.3% | 53% | higher time in every pair, beyond control spread |
| credential / build application-default context | 24 | 17 | -27.9% | -26.2% | -32.1% | 22.7% | lower time in every pair, beyond control spread |
| credential / reuse service-account factory | 2048 | 5025 | 146.2% | 144.8% | 146.6% | 22.3% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 157 | 232 | 47.7% | 46.9% | 51.2% | 2.3% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3059 | 1296 | -58.7% | -57.5% | -59% | 5% | lower time in every pair, beyond control spread |

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
