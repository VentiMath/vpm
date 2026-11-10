# vmotion-dom measurements

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

Recorded 2026-11-10T06:49:44.682Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| select, animate, seek and stop 1 elements | 5239 | 4442 | -15.7% | -13% | -35% | 14.6% | unestablished at this precision |
| select, animate, seek and stop 8 elements | 35581 | 27829 | -12% | -14.6% | -12% | 5.1% | unestablished at this precision |
| select, animate, seek and stop 32 elements | 138070 | 127710 | 1.1% | -6% | 1.1% | 1.9% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-10T06:49:58.364Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| select, animate, seek and stop 1 elements | 3055 | 2021 | -32% | -30.1% | -33.5% | 3.4% | lower time in every pair, beyond control spread |
| select, animate, seek and stop 8 elements | 19324 | 17225 | -11.2% | -4% | -13.7% | 4.4% | unestablished at this precision |
| select, animate, seek and stop 32 elements | 73344 | 73843 | 0.7% | -1.4% | 5.7% | 7.7% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/selectors.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/selectors/node-isolated.json node packages/vmotion-dom/bench/selectors.cjs
OUTPUT=packages/vmotion-dom/bench/selectors/bun-isolated.json bun packages/vmotion-dom/bench/selectors.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom selectors selectors.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
