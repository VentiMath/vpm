# vreact-hook-form measurements

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

Recorded 2026-11-12T19:15:26.214Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| update one input in a mounted twenty-field form | 15361 | 17782 | 10.9% | 10.9% | 31.1% | 48.3% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-12T19:15:34.041Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| update one input in a mounted twenty-field form | 11756 | 13326 | 15% | 2.5% | 26.8% | 2.5% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/updates.cjs:

```sh
OUTPUT=packages/vreact-hook-form/bench/updates/node-isolated.json node packages/vreact-hook-form/bench/updates.cjs
OUTPUT=packages/vreact-hook-form/bench/updates/bun-isolated.json bun packages/vreact-hook-form/bench/updates.cjs
node scripts/render-bench-report.cjs packages/vreact-hook-form updates updates.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.

## Workload limits

Production React 19.3.1 commits one `setValue` with `shouldDirty` into a mounted
twenty-input form in jsdom 27.3. Every operation reads the resulting input value.
The dirty flag and controlled input are live; untouched inputs no longer render
for the edit. This measures React/DOM CPU work, not a browser frame rate.

Node medians are 15.361 → 17.782 μs; Bun 11.756 → 13.326 μs. Paired directions
vary, so neither a speedup nor a stable regression is established. The initial
broad-subscription implementation was rejected after measuring roughly six
times the update time. Field-filtered notifications, observed state properties
and a bounded validated-path cache remove that large avoidable cost.
