# vradix-react-use-effect-event measurements

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

Recorded 2026-11-03T18:53:47.945Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| React 19.1 / commit and invoke | 2801 | 2747 | -2.5% | -2.8% | 3.4% | 4.2% | unestablished at this precision |
| React 19.1 / retained invocation | 6 | 6 | 1.4% | 19.9% | -17.5% | 20.6% | unestablished at this precision |
| React 19.2 / commit and invoke | 2890 | 2859 | -2.3% | 0.5% | -6.5% | 3.6% | unestablished at this precision |
| React 19.2 / retained invocation | 16 | 16 | -0.5% | 5.5% | -6.4% | 5.6% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-03T18:54:04.304Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| React 19.1 / commit and invoke | 1701 | 1687 | -1.3% | -2.2% | 2.7% | 2.9% | unestablished at this precision |
| React 19.1 / retained invocation | 1 | 1 | 0.4% | -1.1% | 0.6% | 0.4% | unestablished at this precision |
| React 19.2 / commit and invoke | 1773 | 1754 | -1.5% | -2.2% | -1.1% | 2.1% | unestablished at this precision |
| React 19.2 / retained invocation | 4 | 4 | 0% | -0.4% | 0.6% | 1% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vradix-react-use-effect-event/bench/results/node-isolated.json node packages/vradix-react-use-effect-event/bench/compare.cjs
OUTPUT=packages/vradix-react-use-effect-event/bench/results/bun-isolated.json bun packages/vradix-react-use-effect-event/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-use-effect-event results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
