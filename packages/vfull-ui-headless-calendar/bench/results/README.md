# vfull-ui-headless-calendar measurements

These records supersede the earlier same-process comparison. Each timed
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
Negative changes mean less time; these are local CPU measurements, not
application throughput or latency guarantees.

## Node 24.22.1

Recorded 2026-11-01T08:51:25.350Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| named zone / 200 timestamps to wall-clock markers | 1278058 | 252042 | -80.2% | -80.7% | -79.8% | 6.2% | lower time in every pair, beyond control spread |
| named zone / 42 day cells to instants and offsets | 491177 | 112856 | -76.8% | -77.1% | -76.8% | 4.9% | lower time in every pair, beyond control spread |
| named zone / format 42 day cells | 547982 | 224681 | -58.9% | -57% | -61.6% | 1.3% | lower time in every pair, beyond control spread |
| named zone / parse 200 ISO strings | 1283379 | 357982 | -72% | -72% | -60.7% | 2.4% | lower time in every pair, beyond control spread |
| local zone / 42 day cells to instants | 11887 | 12747 | 6.7% | 6.7% | 9.9% | 1.2% | higher time in every pair, beyond control spread |
| UTC / parse 200 ISO strings and add a month | 112726 | 117264 | 3.6% | 3.6% | 3.3% | 2.2% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T08:51:49.979Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| named zone / 200 timestamps to wall-clock markers | 509568 | 245632 | -51.4% | -52.5% | -50.6% | 5.9% | lower time in every pair, beyond control spread |
| named zone / 42 day cells to instants and offsets | 101292 | 111619 | 10.2% | 10.2% | 10.7% | 1.7% | higher time in every pair, beyond control spread |
| named zone / format 42 day cells | 200116 | 206303 | 3.1% | -6.5% | 19.6% | 3.6% | unestablished at this precision |
| named zone / parse 200 ISO strings | 514875 | 322380 | -37.6% | -35.4% | -38.4% | 5.7% | lower time in every pair, beyond control spread |
| local zone / 42 day cells to instants | 4906 | 5304 | 7.6% | 6.6% | 8.8% | 1.3% | higher time in every pair, beyond control spread |
| UTC / parse 200 ISO strings and add a month | 87751 | 97601 | 11.2% | 11.7% | 10.9% | 2.1% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vfull-ui-headless-calendar/bench/results/node-isolated.json node packages/vfull-ui-headless-calendar/bench/compare.cjs
OUTPUT=packages/vfull-ui-headless-calendar/bench/results/bun-isolated.json bun packages/vfull-ui-headless-calendar/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vfull-ui-headless-calendar
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
