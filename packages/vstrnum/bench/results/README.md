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

Recorded 2026-11-01T09:52:43.658Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| short integers | 280 | 134 | -52.1% | -52.4% | -51.8% | 4.8% | lower time in every pair, beyond control spread |
| XML default options | 299 | 133 | -56.4% | -58.4% | -55.5% | 1.3% | lower time in every pair, beyond control spread |
| non-numeric XML values | 173 | 60 | -65.4% | -66.5% | -65.4% | 1.1% | lower time in every pair, beyond control spread |
| decimal with trailing zeros | 431 | 282 | -34.6% | -35.7% | -25.4% | 2.9% | lower time in every pair, beyond control spread |
| scientific notation | 273 | 158 | -42.1% | -47.2% | -41.5% | 1.3% | lower time in every pair, beyond control spread |
| hex binary octal | 195 | 89 | -54% | -54% | -60.5% | 1.9% | lower time in every pair, beyond control spread |
| precision-preserving rejection | 372 | 296 | -21.3% | -21.3% | -21% | 1.2% | lower time in every pair, beyond control spread |
| Unicode normalization | 556 | 354 | -36.5% | -39% | -36.3% | 1.1% | lower time in every pair, beyond control spread |
| skip pattern | 133 | 43 | -67.8% | -66.8% | -68.3% | 2.5% | lower time in every pair, beyond control spread |
| overflow handling | 206 | 153 | -26.3% | -25.8% | -26.3% | 2.3% | lower time in every pair, beyond control spread |
| long decimal 4KiB | 9113 | 5084 | -43.8% | -43.7% | -44.4% | 0.5% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T09:53:32.154Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| short integers | 234 | 79 | -66.1% | -68.1% | -64.4% | 5% | lower time in every pair, beyond control spread |
| XML default options | 259 | 81 | -68.9% | -70.3% | -67.4% | 96.1% | unestablished at this precision |
| non-numeric XML values | 147 | 36 | -75.1% | -75.1% | -82.2% | 4.7% | lower time in every pair, beyond control spread |
| decimal with trailing zeros | 420 | 168 | -60% | -59.7% | -60.4% | 1.6% | lower time in every pair, beyond control spread |
| scientific notation | 220 | 93 | -56.7% | -55.9% | -59% | 6.5% | lower time in every pair, beyond control spread |
| hex binary octal | 203 | 44 | -78.1% | -78.7% | -77.7% | 5.8% | lower time in every pair, beyond control spread |
| precision-preserving rejection | 293 | 163 | -44.2% | -43.2% | -49.9% | 2.4% | lower time in every pair, beyond control spread |
| Unicode normalization | 450 | 236 | -47.7% | -47.7% | -45.5% | 9.5% | lower time in every pair, beyond control spread |
| skip pattern | 136 | 30 | -77.7% | -77.7% | -78% | 2.5% | lower time in every pair, beyond control spread |
| overflow handling | 175 | 94 | -46.2% | -46.5% | -44.8% | 3.7% | lower time in every pair, beyond control spread |
| long decimal 4KiB | 8054 | 4595 | -42.3% | -56.1% | -41.6% | 3% | lower time in every pair, beyond control spread |

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
