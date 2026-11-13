# vmui-material text and icon measurements

Each operation renders twelve Typography, Link or SvgIcon elements beneath an app-shaped CSS-variable theme. Theme and React-tree creation happen before timing. Controls are Material 9.5.0 and app-pinned 7.2.0 on React 19.3.1; the candidate uses the full VPM styling closure. All twelve runtime/control comparisons are inconclusive at this precision. Identical-source controls vary by as much as 31.6%; no speedup or regression is established.

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

Recorded 2026-11-13T21:38:49.705Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 typography SSR | 510256 | 563067 | 8.5% | 16.3% | -2.7% | 10.5% | unestablished at this precision |
| Material9 links SSR | 712947 | 676280 | -4.9% | -4.9% | -0.1% | 6.4% | unestablished at this precision |
| Material9 icons SSR | 509774 | 474386 | -2.7% | -2.7% | -21.6% | 21.7% | unestablished at this precision |
| App7 typography SSR | 654171 | 438899 | -36% | -21.2% | -41.2% | 26.2% | unestablished at this precision |
| App7 links SSR | 760609 | 713546 | -11.6% | -11.6% | 22.4% | 26.8% | unestablished at this precision |
| App7 icons SSR | 452279 | 457304 | -4.2% | -6.9% | 4.2% | 31.6% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-13T21:39:19.283Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 typography SSR | 308383 | 361411 | 17.2% | 31.5% | 17.2% | 17.1% | unestablished at this precision |
| Material9 links SSR | 537420 | 608381 | -4.5% | 22.7% | -4.5% | 27.6% | unestablished at this precision |
| Material9 icons SSR | 355293 | 321815 | -8% | 1.8% | -8% | 5.4% | unestablished at this precision |
| App7 typography SSR | 345053 | 325905 | -5.7% | -6% | -5.7% | 16.1% | unestablished at this precision |
| App7 links SSR | 449078 | 438583 | -7.6% | -9.6% | -1.4% | 0.7% | unestablished at this precision |
| App7 icons SSR | 243439 | 270645 | 9.5% | 5.5% | 11.3% | 14% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/text.cjs:

```sh
node scripts/mui-material-conformance/text-build.cjs
OUTPUT=packages/vmui-material/bench/text/node-isolated.json node packages/vmui-material/bench/text.cjs
OUTPUT=packages/vmui-material/bench/text/bun-isolated.json bun packages/vmui-material/bench/text.cjs
node scripts/render-bench-report.cjs packages/vmui-material text text.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
