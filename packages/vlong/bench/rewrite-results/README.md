# vlong measurements

Each timed implementation runs in a fresh process: four balanced AB/BA comparison
pairs, then two identical-upstream control pairs. Each case warms for at least
150 ms, recalibrates, and records 12 blocks with matched iteration counts. Results
are checked outside timing; all samples, process IDs and source hashes are retained.
A direction is unestablished if it reverses or overlaps the largest absolute
control difference (minimum 2%). This is descriptive evidence, not a confidence
interval or a guarantee of whole-application performance.

These recordings describe the independent 5.3.2 runtime. The earlier
[results](../results/README.md) describe the retained upstream arithmetic and are
historical. Measurements use normal WebAssembly availability; the BigInt fallback
is correctness-tested but not timed here. Small integer construction no longer
returns cached mutable objects; validated byte input also has a measurable cost.

## Node 24.22.1

Recorded 2026-11-02T05:44:06.458Z on Apple M1 Pro, darwin/arm64.
[Raw samples and source hashes](node.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| small signed construction | 3 | 6 | 64.1% | 105.8% | 56.8% | 13% | higher time in every pair, beyond control spread |
| small unsigned construction | 6 | 10 | 57.9% | 85.6% | 35.5% | 20% | higher time in every pair, beyond control spread |
| short decimal parse | 69 | 28 | -59.6% | -60.1% | -54.4% | 4.1% | lower time in every pair, beyond control spread |
| signed int64 decimal parse | 311 | 118 | -62% | -63.1% | -60.8% | 2.8% | lower time in every pair, beyond control spread |
| unsigned int64 decimal parse | 293 | 116 | -59.9% | -60.3% | -58.7% | 3.1% | lower time in every pair, beyond control spread |
| hexadecimal parse | 189 | 135 | -28.8% | -29.1% | -19.9% | 13.3% | unestablished at this precision |
| base36 parse | 214 | 116 | -46% | -46% | -48.9% | 75.3% | unestablished at this precision |
| short decimal format | 52 | 10 | -80.7% | -80.8% | -80.7% | 8.2% | lower time in every pair, beyond control spread |
| signed int64 decimal format | 487 | 59 | -87.8% | -87.8% | -88% | 3.9% | lower time in every pair, beyond control spread |
| unsigned int64 decimal format | 448 | 73 | -83.8% | -84% | -83.5% | 3.2% | lower time in every pair, beyond control spread |
| hexadecimal format | 338 | 76 | -77.5% | -77.5% | -77.2% | 25.3% | lower time in every pair, beyond control spread |
| multiply | 27 | 16 | -42.5% | -41.5% | -43.8% | 1% | lower time in every pair, beyond control spread |
| divide | 39 | 32 | -16.9% | -16.7% | -17.1% | 2.9% | lower time in every pair, beyond control spread |
| eight array bytes | 10 | 19 | 99.7% | 92.7% | 109.2% | 30.6% | higher time in every pair, beyond control spread |
| eight Uint8Array bytes | 11 | 14 | 24.9% | 22.3% | 26.8% | 1.2% | higher time in every pair, beyond control spread |
| protobuf 8 fromObject + encode | 3496 | 1986 | -43.1% | -42.1% | -43.1% | 4.2% | lower time in every pair, beyond control spread |
| protobuf 8 decode + toObject | 4829 | 1542 | -67.8% | -67.7% | -68.1% | 12.8% | lower time in every pair, beyond control spread |
| protobuf 7 fromObject + encode | 3438 | 1909 | -44.7% | -43.1% | -44.7% | 2% | lower time in every pair, beyond control spread |
| protobuf 7 decode + toObject | 4224 | 1490 | -65% | -65.3% | -64.8% | 2.7% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-02T05:45:20.026Z on Apple M1 Pro, darwin/arm64.
[Raw samples and source hashes](bun.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| small signed construction | 5 | 5 | -8.5% | -6.1% | -10.8% | 0.2% | lower time in every pair, beyond control spread |
| small unsigned construction | 2 | 5 | 81.4% | 85.9% | 76.4% | 2% | higher time in every pair, beyond control spread |
| short decimal parse | 60 | 40 | -33.1% | -28% | -37.6% | 5.3% | lower time in every pair, beyond control spread |
| signed int64 decimal parse | 178 | 125 | -31.3% | -31.3% | -29% | 35.9% | unestablished at this precision |
| unsigned int64 decimal parse | 161 | 144 | -11.3% | -11.5% | -10.4% | 29.6% | unestablished at this precision |
| hexadecimal parse | 111 | 103 | -8.3% | -6.4% | -8.3% | 11.8% | unestablished at this precision |
| base36 parse | 119 | 80 | -33.5% | -33.5% | -32.8% | 19.1% | lower time in every pair, beyond control spread |
| short decimal format | 54 | 12 | -77.5% | -77.3% | -77.5% | 3.1% | lower time in every pair, beyond control spread |
| signed int64 decimal format | 227 | 125 | -45% | -44.7% | -51.8% | 3.6% | lower time in every pair, beyond control spread |
| unsigned int64 decimal format | 213 | 131 | -38.3% | -39% | -38.3% | 2.5% | lower time in every pair, beyond control spread |
| hexadecimal format | 217 | 80 | -62.6% | -62.8% | -62.6% | 13.5% | lower time in every pair, beyond control spread |
| multiply | 15 | 21 | 44.1% | 48.1% | 21.6% | 7.1% | unestablished at this precision |
| divide | 22 | 24 | -3.2% | 13.7% | -12.5% | 57.8% | unestablished at this precision |
| eight array bytes | 10 | 30 | 190% | 197.6% | 154.8% | 15.7% | higher time in every pair, beyond control spread |
| eight Uint8Array bytes | 14 | 30 | 110.6% | 114.7% | 109.9% | 8.7% | higher time in every pair, beyond control spread |
| protobuf 8 fromObject + encode | 2672 | 2221 | -15.6% | -20.6% | -14.2% | 2.4% | lower time in every pair, beyond control spread |
| protobuf 8 decode + toObject | 3408 | 2051 | -40.7% | -40.8% | -37.9% | 9.2% | lower time in every pair, beyond control spread |
| protobuf 7 fromObject + encode | 2493 | 2182 | -12.4% | -14.7% | -12.4% | 10.4% | lower time in every pair, beyond control spread |
| protobuf 7 decode + toObject | 2861 | 1870 | -34% | -42.2% | -34% | 9.1% | lower time in every pair, beyond control spread |

## Reproduce

Install the pinned comparison fixture, then run serially:

```sh
OUTPUT=packages/vlong/bench/rewrite-results/node.json node packages/vlong/bench/compare.cjs
OUTPUT=packages/vlong/bench/rewrite-results/bun.json bun packages/vlong/bench/compare.cjs
```
