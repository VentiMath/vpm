# vradix-react-id measurements

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

Recorded 2026-11-03T19:19:34.010Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| React 19.1 / SSR 32 IDs | 24278 | 22207 | 6% | 67% | -4.6% | 25.3% | unestablished at this precision |
| React 19.1 / commit 32 IDs | 45063 | 46212 | 9.1% | 106% | 9.1% | 22.2% | unestablished at this precision |
| React 19.2 / SSR 32 IDs | 33156 | 23960 | -18.5% | -22.6% | -18.5% | 96.8% | unestablished at this precision |
| React 19.2 / commit 32 IDs | 48741 | 39538 | -7% | 30.3% | -38.4% | 919.3% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-03T19:19:59.425Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| React 19.1 / SSR 32 IDs | 17788 | 15252 | -11.4% | -14.9% | -9.1% | 13.2% | unestablished at this precision |
| React 19.1 / commit 32 IDs | 36111 | 25527 | -29.6% | 3.5% | -53.4% | 14.1% | unestablished at this precision |
| React 19.2 / SSR 32 IDs | 18633 | 16284 | -9.7% | -2.3% | -35% | 28.8% | unestablished at this precision |
| React 19.2 / commit 32 IDs | 26847 | 23759 | -12.6% | 7.3% | -30% | 11.7% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vradix-react-id/bench/results/node-isolated.json node packages/vradix-react-id/bench/compare.cjs
OUTPUT=packages/vradix-react-id/bench/results/bun-isolated.json bun packages/vradix-react-id/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-id results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
