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

Recorded 2026-11-15T01:39:54.475Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 single SSR | 439042 | 459968 | 4.7% | 10% | 0.6% | 2.1% | unestablished at this precision |
| Material9 multiline SSR | 540230 | 465724 | -10.7% | -18% | -10.1% | 6% | lower time in every pair, beyond control spread |
| Material9 form SSR | 842449 | 970440 | 12.7% | 11.1% | 15.7% | 14.7% | unestablished at this precision |
| App7 single SSR | 400073 | 435219 | 8.3% | 8.3% | 9.3% | 6.6% | unestablished at this precision |
| App7 multiline SSR | 493242 | 450066 | -9.7% | -9.7% | -9.2% | 9.5% | unestablished at this precision |
| App7 form SSR | 840585 | 921414 | 9.8% | 8.7% | 12.3% | 6.8% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-15T01:40:28.143Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 single SSR | 256964 | 290089 | 15.1% | 14.5% | 17.2% | 7.9% | higher time in every pair, beyond control spread |
| Material9 multiline SSR | 294471 | 275741 | -6.2% | -4.1% | -21.4% | 3.2% | lower time in every pair, beyond control spread |
| Material9 form SSR | 525039 | 648608 | 21.7% | 22.6% | 21.4% | 4.8% | higher time in every pair, beyond control spread |
| App7 single SSR | 248917 | 281296 | 16.4% | 9.4% | 16.8% | 7.4% | unestablished at this precision |
| App7 multiline SSR | 297811 | 289513 | -2.4% | -1.5% | -6.4% | 0.8% | unestablished at this precision |
| App7 form SSR | 532840 | 647121 | 18.8% | 18.8% | 19% | 1.8% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/input.cjs:

```sh
OUTPUT=packages/vmui-material/bench/input/node-isolated.json node packages/vmui-material/bench/input.cjs
OUTPUT=packages/vmui-material/bench/input/bun-isolated.json bun packages/vmui-material/bench/input.cjs
node scripts/render-bench-report.cjs packages/vmui-material input input.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
