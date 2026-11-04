# vlx measurements

These are historical core-engine measurements for r5 (commit 1289a87). r6
changed only the React mounting layer; [r5/r6 React measurements](react.md) cover
that change. **r7 changes the layout output abstraction**, so the tables below
do not describe current performance. See the [r6/r7 measurements](react-r7.md)
for native React gains and the remaining uncached string-output regression.

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

Recorded 2026-11-04T06:59:47.852Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 35628 | 23587 | -32.6% | -33.8% | -31.7% | 2.1% | lower time in every pair, beyond control spread |
| SVG / fraction / uncached | 271507 | 20022 | -92.5% | -94.5% | -91.2% | 8.6% | lower time in every pair, beyond control spread |
| HTML / styled text / uncached | 59235 | 32799 | -43.4% | -50% | -43.4% | 1.6% | lower time in every pair, beyond control spread |
| SVG / styled text / uncached | 1080371 | 31562 | -97% | -97.5% | -96.6% | 25.3% | lower time in every pair, beyond control spread |
| HTML / array / uncached | 57064 | 28324 | -50.1% | -53.2% | -50.1% | 1.8% | lower time in every pair, beyond control spread |
| SVG / array / uncached | 425147 | 26139 | -93.7% | -95.4% | -93.1% | 54.5% | lower time in every pair, beyond control spread |
| HTML / contest relations / uncached | 67343 | 31858 | -52.7% | -51.2% | -54.7% | 4.8% | lower time in every pair, beyond control spread |
| SVG / contest relations / uncached | 601789 | 28714 | -95.2% | -95.4% | -95.1% | 4.8% | lower time in every pair, beyond control spread |
| HTML / continued fraction and operators / uncached | 65591 | 32091 | -51.5% | -51.5% | -49.2% | 3.1% | lower time in every pair, beyond control spread |
| SVG / continued fraction and operators / uncached | 1497610 | 32955 | -97.7% | -98.3% | -97.6% | 5.9% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-04T07:02:40.384Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 40901 | 30575 | -25.3% | -25% | -26.1% | 5% | lower time in every pair, beyond control spread |
| SVG / fraction / uncached | 170353 | 34152 | -80.9% | -85.2% | -79% | 17.9% | lower time in every pair, beyond control spread |
| HTML / styled text / uncached | 56720 | 42778 | -25.5% | -20.4% | -25.9% | 7.3% | lower time in every pair, beyond control spread |
| SVG / styled text / uncached | 800413 | 42310 | -94.6% | -95.4% | -94.2% | 12.5% | lower time in every pair, beyond control spread |
| HTML / array / uncached | 52643 | 40021 | -23.6% | -20.5% | -26.5% | 17.5% | unestablished at this precision |
| SVG / array / uncached | 316049 | 36323 | -88.4% | -89.2% | -88.4% | 7% | lower time in every pair, beyond control spread |
| HTML / contest relations / uncached | 66530 | 39450 | -40% | -40.5% | -38.3% | 9.6% | lower time in every pair, beyond control spread |
| SVG / contest relations / uncached | 453671 | 37912 | -91.5% | -92.5% | -91.1% | 38.4% | lower time in every pair, beyond control spread |
| HTML / continued fraction and operators / uncached | 67197 | 46614 | -31.9% | -28.7% | -35.5% | 14.8% | lower time in every pair, beyond control spread |
| SVG / continued fraction and operators / uncached | 1115230 | 42329 | -96.2% | -96.5% | -96.1% | 5% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vlx/bench/results/node-isolated.json node packages/vlx/bench/compare.cjs
OUTPUT=packages/vlx/bench/results/bun-isolated.json bun packages/vlx/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vlx results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
