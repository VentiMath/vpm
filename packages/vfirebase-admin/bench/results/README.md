# vfirebase-admin measurements

These records supersede the earlier same-process comparison. Each timed
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

Recorded 2026-11-01T11:52:15.646Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / verify RS256 ID token signature | 45407 | 24248 | -46.4% | -46.4% | -46.2% | 58.7% | unestablished at this precision |
| auth / decode ID token | 2870 | 2057 | -28.6% | -28.6% | -29% | 45.7% | unestablished at this precision |
| messaging / copy and validate a message | 1461 | 1497 | 1% | -27.7% | 4.1% | 17.3% | unestablished at this precision |
| app / create context and read project | 201 | 343 | 71.7% | 69.4% | 75.2% | 3.5% | higher time in every pair, beyond control spread |
| app / repeat initialization with equal options | 599 | 878 | 46.6% | 53.8% | 39.6% | 12.9% | higher time in every pair, beyond control spread |
| app / cached service lookup | 17 | 16 | -3% | -3% | -4.6% | 72.8% | unestablished at this precision |
| auth / cached OAuth access token | 98 | 97 | -1.4% | 3.4% | -6.7% | 6.3% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 6625 | 2072 | -69.2% | -68.5% | -69.6% | 2.5% | lower time in every pair, beyond control spread |
| app / dispose three services | 490 | 1212 | 146.1% | 147.4% | 141.8% | 3.4% | higher time in every pair, beyond control spread |
| credential / build application-default context | 24 | 25 | 6.5% | 6.5% | -2.5% | 1.6% | unestablished at this precision |
| credential / reuse service-account factory | 4240 | 4255 | 0.3% | -1.1% | 2.8% | 0.2% | unestablished at this precision |
| credential / acquire cached Google client token | 190 | 367 | 95% | 92.5% | 98.6% | 1.3% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 4199 | 1946 | -53.7% | -53.7% | -53.7% | 11.6% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T11:53:08.733Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / verify RS256 ID token signature | 24133 | 17613 | -27.1% | -27.3% | -26.1% | 2.7% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2445 | 1599 | -34.1% | -34.5% | -33.6% | 3.4% | lower time in every pair, beyond control spread |
| messaging / copy and validate a message | 595 | 606 | 1.8% | -2.6% | 3.1% | 5.1% | unestablished at this precision |
| app / create context and read project | 137 | 211 | 49.7% | 12.9% | 62.5% | 4.9% | unestablished at this precision |
| app / repeat initialization with equal options | 190 | 507 | 166.3% | 158.1% | 374.9% | 3.6% | higher time in every pair, beyond control spread |
| app / cached service lookup | 14 | 17 | 24.1% | 26.4% | 23.6% | 7.3% | higher time in every pair, beyond control spread |
| auth / cached OAuth access token | 69 | 71 | 2.8% | -6.8% | 6.9% | 4.5% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 3493 | 1247 | -64% | -65.2% | -63.6% | 3.3% | lower time in every pair, beyond control spread |
| app / dispose three services | 411 | 953 | 133% | 130.2% | 133% | 13.3% | higher time in every pair, beyond control spread |
| credential / build application-default context | 27 | 16 | -41.5% | -41.3% | -41.9% | 3.9% | lower time in every pair, beyond control spread |
| credential / reuse service-account factory | 2111 | 5014 | 139.4% | 136% | 140.4% | 4.7% | higher time in every pair, beyond control spread |
| credential / acquire cached Google client token | 169 | 249 | 48.4% | 47% | 48.4% | 9.2% | higher time in every pair, beyond control spread |
| credential / twenty concurrent acquisitions | 3219 | 1383 | -57.7% | -61.9% | -57.7% | 4.5% | lower time in every pair, beyond control spread |

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
