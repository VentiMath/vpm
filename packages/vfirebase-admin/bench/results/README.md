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

Recorded 2026-11-01T11:30:56.947Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / verify RS256 ID token signature | 43865 | 23576 | -46.2% | -45.1% | -47.1% | 1.4% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2707 | 2006 | -25.9% | -26.6% | -25.8% | 0.6% | lower time in every pair, beyond control spread |
| messaging / copy and validate a message | 1430 | 1425 | -0.5% | 9.8% | -0.5% | 10% | unestablished at this precision |
| app / create context and read project | 195 | 338 | 74.3% | 73.7% | 75.2% | 1.8% | higher time in every pair, beyond control spread |
| app / repeat initialization with equal options | 575 | 849 | 47.5% | 47.5% | 47.5% | 3.7% | higher time in every pair, beyond control spread |
| app / cached service lookup | 16 | 15 | -7.9% | 1.7% | -9.8% | 0.6% | unestablished at this precision |
| auth / cached OAuth access token | 92 | 92 | 0.5% | 0% | 0.6% | 24.2% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 6339 | 1991 | -68.7% | -69.1% | -68.3% | 1.3% | lower time in every pair, beyond control spread |
| app / dispose three services | 478 | 1162 | 145.1% | 145.1% | 141.5% | 7.3% | higher time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T11:31:33.700Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| auth / verify RS256 ID token signature | 23433 | 17106 | -27% | -26.7% | -27.4% | 5.8% | lower time in every pair, beyond control spread |
| auth / decode ID token | 2332 | 1587 | -31.9% | -27.8% | -34% | 25.8% | unestablished at this precision |
| messaging / copy and validate a message | 546 | 561 | 1.3% | 0.2% | 1.3% | 3% | unestablished at this precision |
| app / create context and read project | 122 | 212 | 73.8% | 68.4% | 77.8% | 12.2% | higher time in every pair, beyond control spread |
| app / repeat initialization with equal options | 180 | 469 | 164.7% | 80.1% | 220.3% | 2% | unestablished at this precision |
| app / cached service lookup | 13 | 16 | 18.2% | -17.8% | 23.2% | 4.3% | unestablished at this precision |
| auth / cached OAuth access token | 62 | 67 | 7.5% | 10.5% | 7.5% | 10.1% | unestablished at this precision |
| auth / twenty concurrent forced refreshes | 3429 | 1171 | -65.5% | -67% | -65.5% | 1.7% | lower time in every pair, beyond control spread |
| app / dispose three services | 389 | 893 | 129.6% | 138.5% | 120.5% | 1.2% | higher time in every pair, beyond control spread |

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
