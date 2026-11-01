# vlong measurements

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

Recorded 2026-11-01T07:16:39.605Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| small signed construction | 3 | 5 | 52.4% | 68.4% | -10.6% | 1.2% | unestablished at this precision |
| small unsigned construction | 7 | 9 | 42% | 62% | 11% | 14.5% | unestablished at this precision |
| short decimal parse | 67 | 37 | -44.9% | -34.8% | -51.3% | 3.9% | lower time in every pair, beyond control spread |
| signed int64 decimal parse | 301 | 131 | -56.5% | -56.6% | -56.1% | 2.4% | lower time in every pair, beyond control spread |
| unsigned int64 decimal parse | 285 | 116 | -59.2% | -58.8% | -59.6% | 4.5% | lower time in every pair, beyond control spread |
| hexadecimal parse | 184 | 121 | -33.6% | -29.2% | -34.5% | 8.8% | lower time in every pair, beyond control spread |
| base36 parse | 211 | 109 | -48.2% | -46.9% | -50.1% | 2.6% | lower time in every pair, beyond control spread |
| short decimal format | 50 | 10 | -80.4% | -80.3% | -80.7% | 2.6% | lower time in every pair, beyond control spread |
| signed int64 decimal format | 465 | 53 | -88.7% | -89% | -88.3% | 1.5% | lower time in every pair, beyond control spread |
| unsigned int64 decimal format | 432 | 68 | -84.1% | -84.1% | -84.1% | 2.7% | lower time in every pair, beyond control spread |
| hexadecimal format | 329 | 71 | -78.4% | -77.7% | -78.4% | 67.8% | lower time in every pair, beyond control spread |
| multiply | 26 | 22 | -16.4% | -16.8% | -16.4% | 15.1% | unestablished at this precision |
| divide | 38 | 33 | -12.9% | -13.3% | -12.3% | 6.9% | lower time in every pair, beyond control spread |
| eight array bytes | 10 | 17 | 80.3% | 56.6% | 80.3% | 1.5% | higher time in every pair, beyond control spread |
| eight Uint8Array bytes | 11 | 11 | -3.8% | -9.9% | -3.8% | 0.1% | lower time in every pair, beyond control spread |
| protobuf 8 fromObject + encode | 3350 | 1995 | -40.8% | -41.3% | -39.9% | 4.8% | lower time in every pair, beyond control spread |
| protobuf 8 decode + toObject | 4543 | 1460 | -68.1% | -72.7% | -66.8% | 4.3% | lower time in every pair, beyond control spread |
| protobuf 7 fromObject + encode | 3324 | 1959 | -41.3% | -40.7% | -41.5% | 6.3% | lower time in every pair, beyond control spread |
| protobuf 7 decode + toObject | 4039 | 1422 | -64.5% | -64.5% | -64.5% | 4.4% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T07:17:54.054Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| small signed construction | 6 | 4 | -24.3% | 12.4% | -25.3% | 1.1% | unestablished at this precision |
| small unsigned construction | 3 | 4 | 56.9% | 67.2% | 56.9% | 79.2% | unestablished at this precision |
| short decimal parse | 65 | 43 | -34.6% | -34.6% | -34% | 52.1% | unestablished at this precision |
| signed int64 decimal parse | 189 | 157 | -17.1% | -12% | -19.9% | 7.8% | lower time in every pair, beyond control spread |
| unsigned int64 decimal parse | 158 | 157 | -0.7% | -2.2% | -0.7% | 6.4% | unestablished at this precision |
| hexadecimal parse | 117 | 115 | -2.2% | 2.9% | -3% | 4.3% | unestablished at this precision |
| base36 parse | 125 | 89 | -27.8% | -25.1% | -27.8% | 3.3% | lower time in every pair, beyond control spread |
| short decimal format | 57 | 8 | -86.3% | -97.1% | -75.8% | 2.3% | lower time in every pair, beyond control spread |
| signed int64 decimal format | 237 | 143 | -40.4% | -20.6% | -40.4% | 1.5% | unestablished at this precision |
| unsigned int64 decimal format | 224 | 147 | -32.9% | -31.6% | -32.9% | 1.3% | lower time in every pair, beyond control spread |
| hexadecimal format | 222 | 87 | -61.1% | -56.4% | -61.1% | 1.6% | lower time in every pair, beyond control spread |
| multiply | 16 | 22 | 40.1% | 88% | 15.3% | 6.7% | higher time in every pair, beyond control spread |
| divide | 32 | 25 | -11.6% | 43.3% | -49.9% | 95.8% | unestablished at this precision |
| eight array bytes | 11 | 29 | 165.6% | 199.4% | 164.5% | 10.4% | higher time in every pair, beyond control spread |
| eight Uint8Array bytes | 15 | 23 | 52.3% | 71.2% | 52.3% | 5.5% | higher time in every pair, beyond control spread |
| protobuf 8 fromObject + encode | 2840 | 2465 | -12.7% | -0.7% | -21.3% | 14.1% | unestablished at this precision |
| protobuf 8 decode + toObject | 3278 | 2122 | -36% | -31.5% | -37.7% | 42.1% | unestablished at this precision |
| protobuf 7 fromObject + encode | 2521 | 2297 | -10.8% | 2.5% | -18.4% | 1% | unestablished at this precision |
| protobuf 7 decode + toObject | 2780 | 1904 | -31.4% | -28.6% | -33.5% | 14.2% | lower time in every pair, beyond control spread |

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
