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

Recorded 2026-11-06T08:10:39.007Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| unchanged uncached math / VLX 0.2.1 | 40660 | 39287 | -4.1% | -2.9% | -4.1% | 3.7% | unestablished at this precision |
| unchanged prose and choices SVG / VLX 0.2.1 | 141158 | 148296 | 5.9% | 10.5% | -0.2% | 12.5% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-06T08:12:30.859Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| unchanged uncached math / VLX 0.2.1 | 42343 | 42713 | -0.5% | 3.2% | -3.4% | 2.2% | unestablished at this precision |
| unchanged prose and choices SVG / VLX 0.2.1 | 140972 | 142565 | 1.6% | 2% | 1.6% | 4.9% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/unicode.cjs:

```sh
OUTPUT=packages/vlx/bench/unicode-results/node-isolated.json node packages/vlx/bench/unicode.cjs
OUTPUT=packages/vlx/bench/unicode-results/bun-isolated.json bun packages/vlx/bench/unicode.cjs
node scripts/render-bench-report.cjs packages/vlx unicode-results unicode.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
