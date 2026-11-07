# vprosemirror-model measurements

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

Recorded 2026-11-07T05:00:34.050Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| construct editor schema | 30167 | 17414 | -37.8% | -26.5% | -49.2% | 73.6% | unestablished at this precision |
| read 80-paragraph JSON document | 42525 | 15348 | -62.6% | -64.8% | -62.6% | 60.4% | unestablished at this precision |
| resolve varied document positions | 630 | 230 | -62.4% | -53.7% | -64.9% | 49% | unestablished at this precision |
| resolve repeated cached position | 26 | 19 | -23.9% | -29.6% | -22.1% | 65.7% | unestablished at this precision |
| insert text in 80-paragraph document | 741 | 415 | -41.7% | -35.3% | -45.3% | 44.6% | unestablished at this precision |
| delete across paragraph boundaries | 4281 | 3575 | 2.4% | 2.6% | 2.4% | 58.8% | unestablished at this precision |
| parse rich HTML (JSDOM) | 41066 | 47000 | 37.9% | -1.4% | 167.9% | 14.1% | unestablished at this precision |
| serialize rich fragment (JSDOM) | 32675 | 37248 | 27.4% | -14.5% | 281.1% | 97.9% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-07T05:01:38.264Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| construct editor schema | 12855 | 8014 | -37.3% | -25.2% | -37.3% | 362% | unestablished at this precision |
| read 80-paragraph JSON document | 26572 | 20461 | -29.4% | -18.6% | -29.7% | 255.4% | unestablished at this precision |
| resolve varied document positions | 411 | 452 | 23% | 13% | 24.2% | 52.4% | unestablished at this precision |
| resolve repeated cached position | 8 | 8 | -4% | -4% | 16.8% | 81.7% | unestablished at this precision |
| insert text in 80-paragraph document | 615 | 366 | -41.4% | -35.3% | -42.4% | 161.3% | unestablished at this precision |
| delete across paragraph boundaries | 2231 | 3322 | 48.9% | 48.9% | 69.3% | 49.7% | unestablished at this precision |
| parse rich HTML (JSDOM) | 15662 | 17648 | 14.6% | 29.9% | 1.2% | 103.9% | unestablished at this precision |
| serialize rich fragment (JSDOM) | 19751 | 15243 | -21.8% | -15.4% | -31.1% | 533.3% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vprosemirror-model/bench/results/node-isolated.json node packages/vprosemirror-model/bench/compare.cjs
OUTPUT=packages/vprosemirror-model/bench/results/bun-isolated.json bun packages/vprosemirror-model/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vprosemirror-model results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
