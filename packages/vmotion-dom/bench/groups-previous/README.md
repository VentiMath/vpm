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

Recorded 2026-11-10T03:43:29.149Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| group, seek, read and stop 1 prepared playback controls | 51 | 69 | 18.4% | 18.4% | 156.4% | 19.7% | unestablished at this precision |
| group, seek, read and stop 8 prepared playback controls | 122 | 113 | -5.5% | -15% | 8.6% | 16.6% | unestablished at this precision |
| create and complete a renderer target with transitionEnd | 20925 | 16251 | -31.3% | -25.7% | -31.3% | 9.5% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-10T03:43:47.069Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| group, seek, read and stop 1 prepared playback controls | 57 | 55 | -3.3% | -11% | -0.7% | 21.9% | unestablished at this precision |
| group, seek, read and stop 8 prepared playback controls | 111 | 111 | 0.3% | 5.6% | -0.6% | 25.3% | unestablished at this precision |
| create and complete a renderer target with transitionEnd | 13474 | 9215 | -32.3% | -29.6% | -32.6% | 9.4% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/groups.cjs:

```sh
VMOTION_GROUPS_PREVIOUS=1 OUTPUT=packages/vmotion-dom/bench/groups-previous/node-isolated.json node packages/vmotion-dom/bench/groups.cjs
VMOTION_GROUPS_PREVIOUS=1 OUTPUT=packages/vmotion-dom/bench/groups-previous/bun-isolated.json bun packages/vmotion-dom/bench/groups.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom groups-previous groups.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.

The upstream columns here are immutable VPM commit `3365200d5149723e870fb93bf217f8be82346226`, reconstructed from git history. This is a before/after comparison, not the upstream package. All pairs and controls are retained.

This before/after suite uses immutable VPM commit `3365200d` as the column labelled “Upstream”; it is not the upstream package. The environment flag in the reproduction commands selects that baseline. Historical source hashes identify the recorded implementation.
