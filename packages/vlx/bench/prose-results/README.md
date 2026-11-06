# vlx measurements

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

Recorded 2026-11-06T08:36:33.032Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| unchanged uncached math / VLX 0.2.2 | 38550 | 39511 | 1.4% | -0.3% | 3.2% | 2.2% | unestablished at this precision |
| unchanged prose and choices SVG / VLX 0.2.2 | 142315 | 147886 | 2.4% | 7.6% | -1.1% | 7.8% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-06T08:39:55.399Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| unchanged uncached math / VLX 0.2.2 | 42555 | 42871 | 0.8% | 2.1% | -4.2% | 4.4% | unestablished at this precision |
| unchanged prose and choices SVG / VLX 0.2.2 | 144309 | 153947 | 4.3% | -3.5% | 36.1% | 3.6% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/prose.cjs:

```sh
OUTPUT=packages/vlx/bench/prose-results/node-isolated.json node packages/vlx/bench/prose.cjs
OUTPUT=packages/vlx/bench/prose-results/bun-isolated.json bun packages/vlx/bench/prose.cjs
node scripts/render-bench-report.cjs packages/vlx prose-results prose.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
