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

Recorded 2026-11-15T20:19:36.734Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 initial Avatar SSR | 223629 | 178292 | -20.3% | -15.8% | -24.9% | 6% | lower time in every pair, beyond control spread |
| Material9 photo Avatar SSR | 242741 | 192819 | -19.4% | -20.6% | -17.9% | 5.7% | lower time in every pair, beyond control spread |
| Material9 fallback Avatar SSR | 319639 | 249893 | -23.3% | -28.1% | -21.1% | 24.6% | unestablished at this precision |
| Material9 chip Avatar SSR | 435593 | 312931 | -27.7% | -29.2% | -23.3% | 8.7% | lower time in every pair, beyond control spread |
| App7 initial Avatar SSR | 191231 | 160928 | -15.2% | -15.2% | -16.5% | 38.4% | unestablished at this precision |
| App7 photo Avatar SSR | 219258 | 193464 | -12.3% | -6.2% | -34.7% | 21.1% | unestablished at this precision |
| App7 fallback Avatar SSR | 271738 | 255097 | -8.9% | -6.5% | -8.9% | 23.5% | unestablished at this precision |
| App7 chip Avatar SSR | 396225 | 310718 | -22.2% | -23.6% | -21.6% | 10% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-15T20:21:07.059Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 initial Avatar SSR | 128060 | 90578 | -29.4% | -31.3% | -27% | 6.9% | lower time in every pair, beyond control spread |
| Material9 photo Avatar SSR | 146009 | 114093 | -22.1% | -23.6% | -20.7% | 5.8% | lower time in every pair, beyond control spread |
| Material9 fallback Avatar SSR | 205359 | 161806 | -19.1% | -23.5% | -17.2% | 9.9% | lower time in every pair, beyond control spread |
| Material9 chip Avatar SSR | 307583 | 203512 | -32.4% | -35.8% | -30.5% | 2% | lower time in every pair, beyond control spread |
| App7 initial Avatar SSR | 133546 | 88288 | -33.6% | -33% | -34.2% | 4.8% | lower time in every pair, beyond control spread |
| App7 photo Avatar SSR | 146076 | 116687 | -18.3% | -24.7% | -15.9% | 1.2% | lower time in every pair, beyond control spread |
| App7 fallback Avatar SSR | 197256 | 165894 | -18.5% | -22.2% | -11.9% | 3.1% | lower time in every pair, beyond control spread |
| App7 chip Avatar SSR | 299677 | 207203 | -29.9% | -45.3% | -25.7% | 1.8% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/avatar.cjs:

```sh
OUTPUT=packages/vmui-material/bench/avatar/node-isolated.json node packages/vmui-material/bench/avatar.cjs
OUTPUT=packages/vmui-material/bench/avatar/bun-isolated.json bun packages/vmui-material/bench/avatar.cjs
node scripts/render-bench-report.cjs packages/vmui-material avatar avatar.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
