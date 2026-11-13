# vmotion-dom random stagger measurements

Cases use 48 items and the current Motion14.7 control. Setup includes the first
lazy shuffle. Repeated samples use a stable permutation; every permutation has
the same delay sum, which is checked outside timing. Exact random order is not
compared. The grid case uses a pure squared easing function. Both implementations
use the runtime's native `Math.random`; random order is not seeded or mocked.

Node establishes lower time for all three cases. Bun establishes lower setup
time; its repeated-sampling directions are unestablished because of process and
control variation. These measure delay preparation/sampling, not frame rate.

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

Recorded 2026-11-13T09:39:25.111Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a 48-item random delay | 709 | 561 | -20.5% | -24% | -16.9% | 2.6% | lower time in every pair, beyond control spread |
| sample all 48 stable random delays | 496 | 173 | -65.1% | -64.7% | -66% | 46.6% | lower time in every pair, beyond control spread |
| sample all 48 eased random grid delays | 617 | 175 | -71.7% | -72.5% | -70.6% | 6.4% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-13T09:39:40.663Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| prepare and sample a 48-item random delay | 726 | 194 | -73.4% | -72.4% | -74% | 4.9% | lower time in every pair, beyond control spread |
| sample all 48 stable random delays | 349 | 122 | -65% | -65.1% | -58.8% | 54.7% | unestablished at this precision |
| sample all 48 eased random grid delays | 385 | 324 | -14.8% | -21.9% | 59.8% | 19.5% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/random.cjs:

```sh
OUTPUT=packages/vmotion-dom/bench/random/node-isolated.json node packages/vmotion-dom/bench/random.cjs
OUTPUT=packages/vmotion-dom/bench/random/bun-isolated.json bun packages/vmotion-dom/bench/random.cjs
node scripts/render-bench-report.cjs packages/vmotion-dom random random.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
