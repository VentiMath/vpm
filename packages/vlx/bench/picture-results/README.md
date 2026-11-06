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

Recorded 2026-11-06T06:04:15.472Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| uncached indexed root / VLX 0.2.0 | 30609 | 29341 | -2% | -16.3% | -2% | 0.8% | unestablished at this precision |
| unchanged square root control / VLX 0.2.0 | 26473 | 25611 | -4.1% | -2.8% | -6% | 2.4% | unestablished at this precision |
| standalone fraction SVG / VLX 0.2.0 | 40994 | 39802 | 0.9% | -13.2% | 6.9% | 10.7% | unestablished at this precision |
| corrected full picture PNG / VLX 0.2.0 | 5510911 | 5716016 | 4.9% | 2.7% | 24.1% | 8.1% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-06T06:05:09.945Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| uncached indexed root / VLX 0.2.0 | 34213 | 32408 | -5.5% | -4.5% | -5.5% | 1.2% | unestablished at this precision |
| unchanged square root control / VLX 0.2.0 | 31315 | 30632 | -9.1% | -9.1% | -8.8% | 2.2% | unestablished at this precision |
| standalone fraction SVG / VLX 0.2.0 | 46023 | 47929 | 2.4% | 4.4% | -0.3% | 3.9% | unestablished at this precision |
| corrected full picture PNG / VLX 0.2.0 | 5648797 | 5734016 | 1.1% | 1.1% | -10.9% | 4.4% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/pictures.cjs:

```sh
OUTPUT=packages/vlx/bench/picture-results/node-isolated.json node packages/vlx/bench/pictures.cjs
OUTPUT=packages/vlx/bench/picture-results/bun-isolated.json bun packages/vlx/bench/pictures.cjs
node scripts/render-bench-report.cjs packages/vlx picture-results pictures.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
