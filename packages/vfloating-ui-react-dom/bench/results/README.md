# vfloating-ui-react-dom measurements

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

Recorded 2026-11-01T22:23:27.064Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| hook / mounted controlled-platform update | 44761 | 67129 | 71.8% | 150.6% | 1.7% | 220.3% | unestablished at this precision |
| middleware / popover chain | 194 | 327 | 50.4% | 67.3% | 39.2% | 57.2% | unestablished at this precision |
| server render / defaults | 9560 | 5053 | -36.8% | -21.5% | -40.1% | 40.1% | unestablished at this precision |
| server render / popover options | 6730 | 5539 | -31.6% | -19.5% | -32.5% | 78.1% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T22:24:01.681Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| hook / mounted controlled-platform update | 3633 | 3932 | 9.6% | 12.8% | 7.6% | 4.4% | higher time in every pair, beyond control spread |
| middleware / popover chain | 95 | 150 | 57.7% | 42.8% | 68.1% | 13% | higher time in every pair, beyond control spread |
| server render / defaults | 1618 | 1672 | 3.1% | -17.6% | 5.6% | 20.2% | unestablished at this precision |
| server render / popover options | 1832 | 1978 | 5.7% | 1% | 9.3% | 10.3% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vfloating-ui-react-dom/bench/results/node-isolated.json node packages/vfloating-ui-react-dom/bench/compare.cjs
OUTPUT=packages/vfloating-ui-react-dom/bench/results/bun-isolated.json bun packages/vfloating-ui-react-dom/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vfloating-ui-react-dom
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
