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

Recorded 2026-11-01T12:40:31.145Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / verify RS256 ID token signature | 44003 | 23589 | -46.5% | -45.3% | -47.2% | 5.7% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2767 | 2004 | -27.6% | -27.6% | 12.9% | 6.6% | unestablished at this precision |
| auth / project a user response | 4306 | 4538 | 4.9% | -5.2% | 6.8% | 24.7% | unestablished at this precision |
| auth / serialize a user record | 317 | 218 | -31.3% | -25.1% | -32.6% | 3.3% | lower time in every pair, beyond control spread |
| messaging / copy and validate a message | 1694 | 1416 | -16.4% | -11.9% | -16.4% | 0.9% | lower time in every pair, beyond control spread |
| app / create context and read project | 246 | 320 | 30.3% | 31.7% | 29.8% | 4.6% | higher time in every pair, beyond control spread |
| app / repeat initialization with equal options | 664 | 838 | 26.8% | 27.8% | 25.1% | 4.1% | higher time in every pair, beyond control spread |
| app / cached service lookup | 16 | 15 | -5.2% | -5.2% | -3.3% | 3.4% | unestablished at this precision |
| auth / cached OAuth access token | 92 | 93 | 2.2% | 10.5% | -0.9% | 1.5% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 6398 | 1967 | -69.3% | -68.8% | -69.3% | 3.6% | lower time in every pair, beyond control spread |
| app / dispose three services | 486 | 1159 | 138.5% | 140.4% | 136.9% | 1.5% | higher time in every pair, beyond control spread |
| credential / build application-default context | 23 | 24 | 7.7% | 7% | 7.7% | 10.9% | unestablished at this precision |
| credential / reuse service-account factory | 4027 | 4280 | 5.7% | 5.9% | 5.3% | 3.3% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 185 | 357 | 93% | 97.4% | 49.9% | 2.3% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 4029 | 1925 | -52.4% | -52.4% | -54.8% | 1.5% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T12:41:33.101Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / verify RS256 ID token signature | 23485 | 16973 | -27.4% | -28.1% | -27% | 2.3% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2337 | 1525 | -34.7% | -33.7% | -34.7% | 2% | lower time in every pair, beyond control spread |
| auth / project a user response | 1185 | 1310 | 10.6% | 10.6% | 10.5% | 1.5% | higher time in every pair, beyond control spread |
| auth / serialize a user record | 479 | 267 | -44.2% | -44.6% | -43.3% | 3.6% | lower time in every pair, beyond control spread |
| messaging / copy and validate a message | 2030 | 562 | -72.3% | -72% | -72.3% | 2.8% | lower time in every pair, beyond control spread |
| app / create context and read project | 244 | 202 | -14.1% | -13.8% | -18.6% | 0.8% | lower time in every pair, beyond control spread |
| app / repeat initialization with equal options | 384 | 475 | 25.5% | 37.4% | 22% | 15.2% | higher time in every pair, beyond control spread |
| app / cached service lookup | 13 | 15 | 17.1% | 14.7% | 20% | 8.8% | higher time in every pair, beyond control spread |
| auth / cached OAuth access token | 62 | 69 | 10.9% | 6.9% | 15.5% | 1.9% | higher time in every pair, beyond control spread |
| auth / twenty concurrent forced refreshes | 3414 | 1129 | -66.9% | -69% | -66.7% | 1.7% | lower time in every pair, beyond control spread |
| app / dispose three services | 401 | 891 | 129.1% | 130.9% | 118.4% | 48.9% | higher time in every pair, beyond control spread |
| credential / build application-default context | 23 | 14 | -42.3% | -41.6% | -42.3% | 7.8% | lower time in every pair, beyond control spread |
| credential / reuse service-account factory | 2045 | 4747 | 131.2% | 132.3% | 130.2% | 4.2% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 155 | 225 | 46.1% | 46.3% | 45.4% | 2.5% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3048 | 1224 | -59.8% | -59.3% | -60.3% | 1% | lower time in every pair, beyond control spread |

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
