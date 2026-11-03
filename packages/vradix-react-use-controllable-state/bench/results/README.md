# vradix-react-use-controllable-state measurements

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

Recorded 2026-11-03T19:54:06.210Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| React 19.1 / controlled proposal | 4 | 5 | 17.7% | 30.1% | 8.6% | 15.4% | unestablished at this precision |
| React 19.1 / uncontrolled commit | 3730 | 3642 | -3.3% | -3.3% | -4.8% | 2% | unestablished at this precision |
| React 19.1 / uncontrolled reducer | 4270 | 4176 | -3.1% | 1.8% | -9.8% | 3.4% | unestablished at this precision |
| React 19.1 / controlled reducer | 3856 | 3990 | 3.2% | 3.4% | 2.8% | 2.1% | higher time in every pair, beyond control spread |
| React 19.2 / controlled proposal | 13 | 14 | 9.6% | 10.5% | 8.6% | 1.2% | higher time in every pair, beyond control spread |
| React 19.2 / uncontrolled commit | 3966 | 3868 | -3.6% | -2.5% | -4.3% | 2.7% | unestablished at this precision |
| React 19.2 / uncontrolled reducer | 4368 | 4247 | -1.4% | 3.8% | -2.7% | 4.9% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-03T19:56:07.697Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| React 19.1 / controlled proposal | 1 | 5 | 335.8% | 335.8% | 337.5% | 0.6% | higher time in every pair, beyond control spread |
| React 19.1 / uncontrolled commit | 2446 | 2426 | -3.6% | -5.4% | 3.7% | 3.6% | unestablished at this precision |
| React 19.1 / uncontrolled reducer | 3170 | 3239 | 8.6% | 2.2% | 19.4% | 10.5% | unestablished at this precision |
| React 19.1 / controlled reducer | 2688 | 2755 | 6.2% | 5.1% | 6.2% | 17.5% | unestablished at this precision |
| React 19.2 / controlled proposal | 12 | 14 | 23.8% | 62.5% | -13.6% | 90% | unestablished at this precision |
| React 19.2 / uncontrolled commit | 2311 | 2327 | 1.9% | 2.7% | 1.7% | 0.6% | unestablished at this precision |
| React 19.2 / uncontrolled reducer | 2493 | 2473 | -0.7% | -0.7% | -0.7% | 2% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vradix-react-use-controllable-state/bench/results/node-isolated.json node packages/vradix-react-use-controllable-state/bench/compare.cjs
OUTPUT=packages/vradix-react-use-controllable-state/bench/results/bun-isolated.json bun packages/vradix-react-use-controllable-state/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-use-controllable-state results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
