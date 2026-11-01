# vstrnum measurements

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

Recorded 2026-11-01T07:05:36.175Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| short integers | 327 | 153 | -53.4% | -53.4% | -53.2% | 2.2% | lower time in every pair, beyond control spread |
| XML default options | 346 | 152 | -56% | -56.8% | -56% | 0.7% | lower time in every pair, beyond control spread |
| non-numeric XML values | 199 | 67 | -66.5% | -66.4% | -66.5% | 1.6% | lower time in every pair, beyond control spread |
| decimal with trailing zeros | 484 | 319 | -33.8% | -34.8% | -33.8% | 0.2% | lower time in every pair, beyond control spread |
| scientific notation | 315 | 185 | -41.3% | -42.4% | -40.2% | 3.1% | lower time in every pair, beyond control spread |
| hex binary octal | 221 | 102 | -53.8% | -54% | -52.7% | 2.3% | lower time in every pair, beyond control spread |
| precision-preserving rejection | 383 | 269 | -29.6% | -28.8% | -29.6% | 4.7% | lower time in every pair, beyond control spread |
| Unicode normalization | 624 | 404 | -35.1% | -36% | -34.2% | 2% | lower time in every pair, beyond control spread |
| skip pattern | 150 | 49 | -67.1% | -66.4% | -67.1% | 2.7% | lower time in every pair, beyond control spread |
| overflow handling | 234 | 171 | -26.8% | -27.2% | -26.4% | 1.8% | lower time in every pair, beyond control spread |
| long decimal 4KiB | 10303 | 5879 | -42.7% | -43.1% | -42.2% | 0.4% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T07:06:21.969Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| short integers | 256 | 90 | -64.9% | -76.1% | -64.8% | 1.9% | lower time in every pair, beyond control spread |
| XML default options | 277 | 93 | -65.6% | -67.5% | -64.1% | 7.6% | lower time in every pair, beyond control spread |
| non-numeric XML values | 151 | 42 | -71.9% | -78.1% | -71.3% | 1.4% | lower time in every pair, beyond control spread |
| decimal with trailing zeros | 422 | 191 | -55.4% | -55.4% | -55.4% | 1.8% | lower time in every pair, beyond control spread |
| scientific notation | 232 | 111 | -52.6% | 2.2% | -52.7% | 3.2% | unestablished at this precision |
| hex binary octal | 221 | 52 | -76.1% | -76.3% | -76.1% | 8.6% | lower time in every pair, beyond control spread |
| precision-preserving rejection | 324 | 188 | -42% | -42.2% | -42% | 3.4% | lower time in every pair, beyond control spread |
| Unicode normalization | 471 | 272 | -42.5% | -42.5% | -41.7% | 4.4% | lower time in every pair, beyond control spread |
| skip pattern | 144 | 36 | -75.1% | -75.1% | -70.7% | 2.4% | lower time in every pair, beyond control spread |
| overflow handling | 185 | 106 | -42.9% | -36.6% | -43% | 3.6% | lower time in every pair, beyond control spread |
| long decimal 4KiB | 9230 | 5390 | -41.9% | -41.6% | -41.9% | 1.4% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vstrnum/bench/results/node-isolated.json node packages/vstrnum/bench/compare.cjs
OUTPUT=packages/vstrnum/bench/results/bun-isolated.json bun packages/vstrnum/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vstrnum
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
