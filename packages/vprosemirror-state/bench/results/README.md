# vprosemirror-state measurements

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

Recorded 2026-11-07T06:30:33.160Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create state without plugins | 253 | 79 | -69% | -69.7% | -68.1% | 5.8% | lower time in every pair, beyond control spread |
| create state with eight plugin fields | 802 | 443 | -44.9% | -44.5% | -44.9% | 2.3% | lower time in every pair, beyond control spread |
| apply metadata with eight plugin fields | 435 | 251 | -42.5% | -44% | -42.5% | 0.5% | lower time in every pair, beyond control spread |
| type into a text selection | 1788 | 1334 | -31.1% | -24.8% | -39.5% | 37.4% | unestablished at this precision |
| replace a marked selection | 2225 | 1386 | -35.5% | -38.6% | -33.6% | 22.1% | lower time in every pair, beyond control spread |
| append a plugin transaction | 4084 | 3348 | -23.6% | -19.9% | -23.6% | 5.9% | lower time in every pair, beyond control spread |
| serialize and restore plugin state | 2054 | 1794 | -15.9% | 10% | -18.6% | 21% | unestablished at this precision |
| reconfigure retained plugin fields | 474 | 283 | -40% | -39.9% | -40.4% | 1.6% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-07T06:31:05.346Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create state without plugins | 134 | 89 | -32.5% | -38.1% | -31.9% | 24% | lower time in every pair, beyond control spread |
| create state with eight plugin fields | 663 | 234 | -64.6% | -68.9% | -64.6% | 4.4% | lower time in every pair, beyond control spread |
| apply metadata with eight plugin fields | 335 | 174 | -48.5% | -53.3% | -47.4% | 16% | lower time in every pair, beyond control spread |
| type into a text selection | 941 | 978 | 3.8% | 3.5% | 3.8% | 23% | unestablished at this precision |
| replace a marked selection | 1226 | 1184 | -3.4% | 1.6% | -10.9% | 6.6% | unestablished at this precision |
| append a plugin transaction | 2283 | 2284 | 0.1% | -0.3% | 0.1% | 1.8% | unestablished at this precision |
| serialize and restore plugin state | 986 | 735 | -25.4% | -23.7% | -32.8% | 7.2% | lower time in every pair, beyond control spread |
| reconfigure retained plugin fields | 335 | 123 | -63.5% | -62.8% | -67.9% | 298.1% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vprosemirror-state/bench/results/node-isolated.json node packages/vprosemirror-state/bench/compare.cjs
OUTPUT=packages/vprosemirror-state/bench/results/bun-isolated.json bun packages/vprosemirror-state/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vprosemirror-state results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
