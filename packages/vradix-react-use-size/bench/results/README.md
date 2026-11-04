# vradix-react-use-size measurements

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

Recorded 2026-11-04T14:31:05.825Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| mount and unmount | 23787 | 24205 | 2.4% | -1.6% | 4.6% | 3.7% | unestablished at this precision |
| unchanged parent update | 4615 | 4595 | -0.4% | 2.1% | -0.4% | 2.5% | unestablished at this precision |
| changed resize | 3937 | 3910 | -0.4% | 0.7% | -0.4% | 1.7% | unestablished at this precision |
| unchanged resize | 3391 | 294 | -91.5% | -91.8% | -88.3% | 14.4% | lower time in every pair, beyond control spread |
| switch target | 8924 | 14343 | 60.7% | 52.6% | 61.8% | 1.9% | higher time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-04T14:32:27.123Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| mount and unmount | 16625 | 18760 | 11.3% | 3.9% | 17.9% | 5.9% | unestablished at this precision |
| unchanged parent update | 2917 | 2941 | 0.8% | 3% | -0.6% | 4.5% | unestablished at this precision |
| changed resize | 2854 | 2819 | 1.3% | -2.9% | 2.7% | 8.7% | unestablished at this precision |
| unchanged resize | 2630 | 326 | -88.2% | -68.6% | -89.4% | 1.4% | lower time in every pair, beyond control spread |
| switch target | 6002 | 11618 | 90.7% | 82.8% | 253.5% | 5.8% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vradix-react-use-size/bench/results/node-isolated.json node packages/vradix-react-use-size/bench/compare.cjs
OUTPUT=packages/vradix-react-use-size/bench/results/bun-isolated.json bun packages/vradix-react-use-size/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-use-size results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
