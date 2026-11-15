# vjs-cookie measurements

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

Recorded 2026-11-15T20:27:04.080Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Current write token | 592 | 432 | -26.7% | -24.8% | -26.7% | 4.1% | lower time in every pair, beyond control spread |
| Current write Unicode | 600 | 494 | -16.9% | -28.8% | -16.9% | 15.3% | unestablished at this precision |
| Current read last | 13581 | 970 | -93% | -94.3% | -92.2% | 2.9% | lower time in every pair, beyond control spread |
| Current read all | 12132 | 5812 | -51.8% | -54.6% | -48.8% | 2.4% | lower time in every pair, beyond control spread |
| App write token | 575 | 439 | -24.4% | -24.4% | -25.2% | 2.9% | lower time in every pair, beyond control spread |
| App write Unicode | 620 | 496 | -18.5% | -22.1% | -16.2% | 1.9% | lower time in every pair, beyond control spread |
| App read last | 9810 | 959 | -90.1% | -90.9% | -89.8% | 7.5% | lower time in every pair, beyond control spread |
| App read all | 10402 | 5908 | -42.7% | -37.5% | -42.7% | 6.9% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-15T20:28:14.710Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Current write token | 212 | 224 | 7.6% | 8.5% | 4.9% | 3.6% | unestablished at this precision |
| Current write Unicode | 408 | 317 | -22.1% | -21% | -23.7% | 1.2% | lower time in every pair, beyond control spread |
| Current read last | 6634 | 691 | -89.7% | -89.7% | -89.8% | 0.6% | lower time in every pair, beyond control spread |
| Current read all | 6859 | 2813 | -59.3% | -59.9% | -59.3% | 1% | lower time in every pair, beyond control spread |
| App write token | 236 | 227 | -4.5% | -4.2% | -4.5% | 2.6% | unestablished at this precision |
| App write Unicode | 439 | 320 | -27.4% | -25.5% | -28.2% | 3.1% | lower time in every pair, beyond control spread |
| App read last | 6485 | 733 | -88.7% | -88.9% | -88.4% | 4.8% | lower time in every pair, beyond control spread |
| App read all | 6443 | 2888 | -55.2% | -55.2% | -55.4% | 3.4% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vjs-cookie/bench/results/node-isolated.json node packages/vjs-cookie/bench/compare.cjs
OUTPUT=packages/vjs-cookie/bench/results/bun-isolated.json bun packages/vjs-cookie/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vjs-cookie results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
