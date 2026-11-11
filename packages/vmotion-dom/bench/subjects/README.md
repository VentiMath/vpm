# vmotion-dom measurements

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

Recorded 2026-11-11T06:46:57.939Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, sample and stop color | 2214 | 3147 | 45% | 45% | 33.4% | 104.8% | unestablished at this precision |
| create, sample and stop unit string | 1746 | 2923 | 61.6% | 50.5% | 86.4% | 71.9% | unestablished at this precision |
| create, sample and stop complex string | 4015 | 3419 | -22% | -46.3% | 14.2% | 27.4% | unestablished at this precision |
| create, sample and stop numeric control | 830 | 1344 | 56.4% | 61.9% | 31.8% | 63.1% | unestablished at this precision |
| create, seek, flush and stop 1 default object properties | 4704 | 5088 | 13.2% | 13.2% | 30.9% | 28.6% | unestablished at this precision |
| create, seek, flush and stop 8 default object properties | 24171 | 30019 | 32.6% | -31.6% | 40.2% | 12.5% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-11T06:47:24.637Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| create, sample and stop color | 946 | 972 | 3.2% | -1.9% | 6.1% | 4.3% | unestablished at this precision |
| create, sample and stop unit string | 718 | 1000 | 42.8% | 42.8% | 39.4% | 4.4% | higher time in every pair, beyond control spread |
| create, sample and stop complex string | 2555 | 1179 | -54% | -52.1% | -54.5% | 4.2% | lower time in every pair, beyond control spread |
| create, sample and stop numeric control | 500 | 487 | -2.5% | -2.5% | -4.4% | 8.4% | unestablished at this precision |
| create, seek, flush and stop 1 default object properties | 2558 | 3599 | 42.9% | 42.9% | 41% | 9.9% | higher time in every pair, beyond control spread |
| create, seek, flush and stop 8 default object properties | 14589 | 22268 | 47% | 47% | 47.7% | 15.7% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/subjects.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/subjects/node-isolated.json node packages/vmotion-dom/bench/subjects.cjs
OUTPUT=packages/vmotion-dom/bench/subjects/bun-isolated.json bun packages/vmotion-dom/bench/subjects.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom subjects subjects.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
