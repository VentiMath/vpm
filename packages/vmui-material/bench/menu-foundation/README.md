# vmui-material measurements

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
Negative changes mean less time; these are local workload measurements, not
application throughput or latency guarantees.

## Node 24.22.1

Recorded 2026-11-15T05:30:11.205Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 items SSR | 489531 | 465183 | -6.4% | -6.6% | -4.7% | 4.1% | unestablished at this precision |
| Material9 dense SSR | 477511 | 443510 | -7.3% | -7.6% | -5.9% | 6.9% | unestablished at this precision |
| Material9 icons SSR | 574042 | 523608 | -8.8% | -7.9% | -9.7% | 2.4% | lower time in every pair, beyond control spread |
| Material9 text SSR | 205296 | 178509 | -12.9% | -13.3% | -12.9% | 4.4% | lower time in every pair, beyond control spread |
| Material9 closed-menu SSR | 229257 | 52299 | -77.2% | -78.4% | -75.6% | 6.3% | lower time in every pair, beyond control spread |
| App7 items SSR | 489252 | 437254 | -10.6% | -10.3% | -13.1% | 5.1% | lower time in every pair, beyond control spread |
| App7 dense SSR | 475033 | 425515 | -10.6% | -10.3% | -10.8% | 1% | lower time in every pair, beyond control spread |
| App7 icons SSR | 585233 | 498376 | -14.8% | -12.3% | -16.4% | 35.7% | unestablished at this precision |
| App7 text SSR | 250782 | 163135 | -34.9% | -34.4% | -36.1% | 56.6% | unestablished at this precision |
| App7 closed-menu SSR | 238896 | 50806 | -78.7% | -80% | -77.5% | 1.3% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-15T05:30:57.267Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 items SSR | 305180 | 259352 | -16.1% | -15.1% | -16.3% | 4.4% | lower time in every pair, beyond control spread |
| Material9 dense SSR | 305858 | 257823 | -16.5% | -16.2% | -16.6% | 1.9% | lower time in every pair, beyond control spread |
| Material9 icons SSR | 390979 | 343822 | -11.8% | -14.5% | -10.8% | 3.7% | lower time in every pair, beyond control spread |
| Material9 text SSR | 146872 | 130285 | -11.3% | -9.1% | -13.9% | 7.8% | lower time in every pair, beyond control spread |
| Material9 closed-menu SSR | 146322 | 31426 | -79.1% | -79.3% | -78.2% | 7.5% | lower time in every pair, beyond control spread |
| App7 items SSR | 317214 | 255102 | -20.6% | -15.3% | -21.3% | 11% | unestablished at this precision |
| App7 dense SSR | 296393 | 256162 | -13.3% | -16.5% | -10.7% | 2.9% | lower time in every pair, beyond control spread |
| App7 icons SSR | 378017 | 342785 | -9.9% | -10.9% | -5.2% | 0.8% | unestablished at this precision |
| App7 text SSR | 178433 | 126132 | -28.6% | -25.5% | -30.1% | 5.7% | lower time in every pair, beyond control spread |
| App7 closed-menu SSR | 166241 | 30497 | -81.5% | -83.6% | -80.1% | 5.1% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/menu-foundation.cjs:

```sh
OUTPUT=packages/vmui-material/bench/menu-foundation/node-isolated.json node packages/vmui-material/bench/menu-foundation.cjs
OUTPUT=packages/vmui-material/bench/menu-foundation/bun-isolated.json bun packages/vmui-material/bench/menu-foundation.cjs
node scripts/render-bench-report.cjs packages/vmui-material menu-foundation menu-foundation.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
