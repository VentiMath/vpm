# Historical vlong measurements

These source-hashed recordings describe the earlier upstream-derived arithmetic
runtime. See the [independent rewrite results](../rewrite-results/README.md) for
the current implementation.

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

Recorded 2026-11-01T09:54:53.298Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| small signed construction | 3 | 6 | 86.3% | 86.3% | 80.1% | 2.3% | higher time in every pair, beyond control spread |
| small unsigned construction | 7 | 10 | 55.4% | 78% | 31.6% | 21.2% | higher time in every pair, beyond control spread |
| short decimal parse | 68 | 39 | -44.3% | -42.7% | -44.3% | 19.4% | lower time in every pair, beyond control spread |
| signed int64 decimal parse | 309 | 135 | -56.7% | -57.1% | -52.7% | 5.3% | lower time in every pair, beyond control spread |
| unsigned int64 decimal parse | 293 | 120 | -59% | -57.3% | -60.1% | 2.5% | lower time in every pair, beyond control spread |
| hexadecimal parse | 178 | 125 | -29.5% | -30.2% | -29.5% | 3.1% | lower time in every pair, beyond control spread |
| base36 parse | 215 | 113 | -47.5% | -47.5% | -47.8% | 3.7% | lower time in every pair, beyond control spread |
| short decimal format | 51 | 10 | -80.1% | -80.6% | -80% | 1.4% | lower time in every pair, beyond control spread |
| signed int64 decimal format | 475 | 55 | -88.6% | -88.5% | -88.6% | 4.1% | lower time in every pair, beyond control spread |
| unsigned int64 decimal format | 442 | 70 | -84.1% | -84.4% | -83.7% | 2.6% | lower time in every pair, beyond control spread |
| hexadecimal format | 340 | 75 | -78.2% | -77.7% | -78.3% | 4% | lower time in every pair, beyond control spread |
| multiply | 27 | 22 | -17.7% | -16.8% | -18.8% | 2.3% | lower time in every pair, beyond control spread |
| divide | 39 | 34 | -13.4% | -13.5% | -3.1% | 4.4% | unestablished at this precision |
| eight array bytes | 9 | 18 | 89.2% | 89.1% | 89.4% | 3.4% | higher time in every pair, beyond control spread |
| eight Uint8Array bytes | 11 | 11 | 0.4% | 1% | -1% | 4.7% | unestablished at this precision |
| protobuf 8 fromObject + encode | 3450 | 2070 | -40% | -41.7% | -39.4% | 4.4% | lower time in every pair, beyond control spread |
| protobuf 8 decode + toObject | 4651 | 1511 | -67.4% | -68.8% | -66.8% | 1.5% | lower time in every pair, beyond control spread |
| protobuf 7 fromObject + encode | 3432 | 2062 | -40% | 3.3% | -41.1% | 2.3% | unestablished at this precision |
| protobuf 7 decode + toObject | 4183 | 1464 | -64.9% | -57.9% | -65% | 4.1% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T09:56:07.423Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| small signed construction | 5 | 4 | -19.4% | -12.7% | -26.8% | 1.5% | lower time in every pair, beyond control spread |
| small unsigned construction | 3 | 4 | 73.2% | 73.2% | 77.3% | 3% | higher time in every pair, beyond control spread |
| short decimal parse | 60 | 39 | -36% | -34.9% | -50.6% | 13.4% | lower time in every pair, beyond control spread |
| signed int64 decimal parse | 180 | 140 | -22.1% | -22.3% | -22.1% | 6.1% | lower time in every pair, beyond control spread |
| unsigned int64 decimal parse | 165 | 141 | -15.1% | -9.3% | -15.6% | 12.6% | unestablished at this precision |
| hexadecimal parse | 109 | 104 | -8.2% | -8.4% | -5.5% | 13.5% | unestablished at this precision |
| base36 parse | 116 | 80 | -31.1% | -30.6% | -31.4% | 15.9% | lower time in every pair, beyond control spread |
| short decimal format | 58 | 6 | -88.8% | -97.7% | -79.1% | 14.3% | lower time in every pair, beyond control spread |
| signed int64 decimal format | 227 | 124 | -45.6% | -66.5% | -45.6% | 11.6% | lower time in every pair, beyond control spread |
| unsigned int64 decimal format | 208 | 131 | -36.8% | -36.1% | -37.9% | 13.9% | lower time in every pair, beyond control spread |
| hexadecimal format | 213 | 78 | -62.9% | -61.9% | -63.1% | 12.8% | lower time in every pair, beyond control spread |
| multiply | 15 | 20 | 36.3% | 62.1% | 10.4% | 4.5% | higher time in every pair, beyond control spread |
| divide | 21 | 22 | 4.8% | 27% | -12.4% | 10.8% | unestablished at this precision |
| eight array bytes | 10 | 26 | 152.8% | 166% | 152.8% | 16.8% | higher time in every pair, beyond control spread |
| eight Uint8Array bytes | 14 | 21 | 51.7% | 57.5% | 40% | 6.3% | higher time in every pair, beyond control spread |
| protobuf 8 fromObject + encode | 2450 | 2242 | -7.8% | -5.5% | -9.7% | 20.6% | unestablished at this precision |
| protobuf 8 decode + toObject | 3131 | 1944 | -37.8% | -38.5% | -36.6% | 18.2% | lower time in every pair, beyond control spread |
| protobuf 7 fromObject + encode | 2295 | 2164 | -3.1% | -16.9% | -3.1% | 199.2% | unestablished at this precision |
| protobuf 7 decode + toObject | 2577 | 1838 | -29.3% | -28% | -29.9% | 9.2% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vlong/bench/results/node-isolated.json node packages/vlong/bench/compare.cjs
OUTPUT=packages/vlong/bench/results/bun-isolated.json bun packages/vlong/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vlong
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
