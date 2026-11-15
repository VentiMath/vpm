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

Recorded 2026-11-15T18:59:50.383Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 switch Switch SSR | 455276 | 474827 | -0.9% | 13.8% | -0.9% | 47% | unestablished at this precision |
| Material9 label Switch SSR | 518381 | 485219 | -6.2% | 9.1% | -15.8% | 46.9% | unestablished at this precision |
| Material9 form Switch SSR | 571385 | 586408 | 5.1% | 5.4% | -12.1% | 18.9% | unestablished at this precision |
| App7 switch Switch SSR | 428131 | 436888 | 8% | 46.6% | -6.2% | 15.9% | unestablished at this precision |
| App7 label Switch SSR | 596419 | 433042 | -27.2% | 40.3% | -27.2% | 21.2% | unestablished at this precision |
| App7 form Switch SSR | 632388 | 481565 | -21.6% | -15.6% | -26.7% | 79.8% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-15T19:00:19.068Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 switch Switch SSR | 517579 | 246294 | -48% | -46.6% | -48% | 14.2% | lower time in every pair, beyond control spread |
| Material9 label Switch SSR | 443262 | 280597 | -33% | -33% | -30.2% | 6.3% | lower time in every pair, beyond control spread |
| Material9 form Switch SSR | 623557 | 439009 | -23.9% | -18.3% | -33.9% | 24.8% | unestablished at this precision |
| App7 switch Switch SSR | 339884 | 256305 | -13.4% | 5% | -30.7% | 30.8% | unestablished at this precision |
| App7 label Switch SSR | 420603 | 395541 | -7.3% | 9% | -23.1% | 34% | unestablished at this precision |
| App7 form Switch SSR | 495201 | 409647 | -17.2% | -11.1% | -18.6% | 39.7% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/switch.cjs:

```sh
OUTPUT=packages/vmui-material/bench/switch/node-isolated.json node packages/vmui-material/bench/switch.cjs
OUTPUT=packages/vmui-material/bench/switch/bun-isolated.json bun packages/vmui-material/bench/switch.cjs
node scripts/render-bench-report.cjs packages/vmui-material switch switch.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
