# vmotion-dom measurements

Each timed
implementation runs alone in a fresh process. Four comparison pairs use
balanced before-first / VPM-first order; two further pairs run identical
before code in separate processes as controls. Warmup lasts at least 150 ms
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

Recorded 2026-11-09T23:25:52.388Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Before ns | VPM ns | Change | Before first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind, transfer and release 1 renderer values | 1156 | 1183 | -0.2% | 13.8% | -5.2% | 17.3% | unestablished at this precision |
| bind, transfer and release 8 renderer values | 7458 | 7455 | -5% | -5% | -3.8% | 33.9% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-09T23:26:04.816Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Before ns | VPM ns | Change | Before first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| bind, transfer and release 1 renderer values | 785 | 800 | -0.2% | -21.4% | -0.2% | 3.5% | unestablished at this precision |
| bind, transfer and release 8 renderer values | 7945 | 7574 | -5.6% | -3.6% | -5.6% | 3.8% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/handoff.cjs:

```sh
VMOTION_HANDOFF_PREVIOUS=1 OUTPUT=packages/vmotion-dom/bench/handoff-previous/node-isolated.json node packages/vmotion-dom/bench/handoff.cjs
VMOTION_HANDOFF_PREVIOUS=1 OUTPUT=packages/vmotion-dom/bench/handoff-previous/bun-isolated.json bun packages/vmotion-dom/bench/handoff.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom handoff-previous handoff.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.

The control is immutable VPM commit `112782a62e5d4a63e395dfb1af6b999c8b9f2b50`, reconstructed from Git history, not upstream Motion. Both cases bind, transfer and remove the same values and drain read-phase disposal. Every before/after direction remains inconclusive; no speedup is claimed.
