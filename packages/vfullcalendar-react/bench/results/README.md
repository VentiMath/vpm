# vfullcalendar-react measurements

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

Recorded 2026-11-02T01:16:29.514Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 20-event mount | 14787969 | 14062240 | -14.5% | -4.6% | -15% | 8.8% | unestablished at this precision |
| 20-event navigate | 13339688 | 10489886 | -21.1% | -4.4% | -29.3% | 1% | unestablished at this precision |
| 20-event change view | 13682104 | 15233500 | 12.2% | 10% | 13.8% | 38.6% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-02T01:17:09.126Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 20-event mount | 9667323 | 9857896 | 2.9% | 9% | -1.8% | 16.2% | unestablished at this precision |
| 20-event navigate | 9237953 | 7711401 | -16.3% | -15.2% | -16.3% | 2.5% | lower time in every pair, beyond control spread |
| 20-event change view | 8023401 | 8849698 | 10.9% | 7.3% | 14.6% | 5.7% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vfullcalendar-react/bench/results/node-isolated.json node packages/vfullcalendar-react/bench/compare.cjs
OUTPUT=packages/vfullcalendar-react/bench/results/bun-isolated.json bun packages/vfullcalendar-react/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vfullcalendar-react results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.

## Workload and limits

These timings mount React in jsdom with 20 events, then measure fresh mounts,
alternating month navigation, and alternating month/week views. They include
synchronous React/DOM work and development-mode React overhead; they do not
measure browser layout, painting, network time or the complete VentiMath app.
Both implementations use the same fixture React and environment. Final Node and
Bun recordings ran serially, without other local test/build jobs from this task.

Node directions are inconclusive in this recording. Bun navigation is 16.3%
faster; changing view is 10.9% slower beyond the identical-source control spread.
The latter is a retained regression, not hidden by the bundle-size improvement.

`node packages/vfullcalendar-react/bench/bundle.cjs --verify-current` reproduces
[bundle.json](bundle.json). The same month/time-grid/interaction/classic entry
produces 37,955 minified / 13,025 gzipped JavaScript bytes for VPM, versus
295,869 / 82,453 upstream. React and CSS are excluded. VPM implements a narrower
application scope, so this 84% gzip reduction is not a full-feature parity claim.
