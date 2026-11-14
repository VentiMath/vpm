# vmui-material measurements

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

Recorded 2026-11-14T12:56:13.523Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 form SSR | 748329 | 983653 | 45.5% | 46.7% | 34.5% | 26.8% | unestablished at this precision |
| Material9 label SSR | 419176 | 510983 | 24.2% | 27.5% | 20.5% | 22.6% | unestablished at this precision |
| Material9 helper SSR | 311913 | 408071 | 31.7% | 225.1% | 17.9% | 90.5% | unestablished at this precision |
| App7 form SSR | 700548 | 965479 | 34.8% | 34.8% | 29.6% | 36% | unestablished at this precision |
| App7 label SSR | 411657 | 461379 | 13.5% | 15.1% | 13.5% | 44.8% | unestablished at this precision |
| App7 helper SSR | 333321 | 418136 | 29.6% | 29.6% | 46% | 78.9% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-14T12:57:24.476Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 form SSR | 336665 | 377531 | 12.4% | 13.7% | 10.8% | 2.2% | higher time in every pair, beyond control spread |
| Material9 label SSR | 173796 | 170500 | -2.8% | 2.9% | -5.5% | 5.7% | unestablished at this precision |
| Material9 helper SSR | 135913 | 131241 | -2.9% | -1.3% | -7.3% | 2.8% | unestablished at this precision |
| App7 form SSR | 335643 | 384907 | 14.5% | 15.4% | 14.1% | 12.5% | unestablished at this precision |
| App7 label SSR | 163938 | 177938 | 11.3% | 12.4% | 4.7% | 4% | unestablished at this precision |
| App7 helper SSR | 133714 | 135160 | 2.8% | -0.3% | 2.9% | 4.7% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/forms.cjs:

```sh
OUTPUT=packages/vmui-material/bench/forms/node-isolated.json node packages/vmui-material/bench/forms.cjs
OUTPUT=packages/vmui-material/bench/forms/bun-isolated.json bun packages/vmui-material/bench/forms.cjs
node scripts/render-bench-report.cjs packages/vmui-material forms forms.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
