# vmotion-dom measurements

This recording includes normalized geometry caching and the reentrant-easing
scale fix. Custom easing still runs per sample; correctness tests cover callbacks
that resize the same grid or throw. These compare upstream with the current VPM
implementation, not the previous VPM revision. The host was under variable load;
identical-source controls expose that variation below. Node repeated sampling
remains slower. No application speedup is claimed.

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

Recorded 2026-11-13T20:04:02.458Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a grid delay | 2444 | 404 | -83.6% | -83.6% | -75% | 64.9% | unestablished at this precision |
| sample all 48 eased grid delays | 973 | 1236 | 27% | 24.9% | 42.7% | 22.9% | higher time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-13T20:04:16.692Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a grid delay | 1936 | 192 | -90.5% | -91.2% | -89.4% | 57.8% | lower time in every pair, beyond control spread |
| sample all 48 eased grid delays | 631 | 1046 | 33.8% | 66.9% | 27.9% | 32.3% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/grid.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/grid/node-isolated.json node packages/vmotion-dom/bench/grid.cjs
OUTPUT=packages/vmotion-dom/bench/grid/bun-isolated.json bun packages/vmotion-dom/bench/grid.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom grid grid.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
