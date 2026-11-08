# VLX 0.2.3 versus KaTeX and MathJax

Refreshed November 8, 2026 against current KaTeX 0.19.1 (HTML + MathML) and
MathJax 4.1.3 (SVG). This replaces the historical r5 snapshot; the runtime code
is unchanged. Each engine receives the same five formulas in display mode.
Renderers and fonts are initialized before timing; MathJax reuses its document
and resets input state. VLX uses uncached `renderMath`, producing SVG, HTML and
MathML together before the requested representation is selected. No renderer
startup, React/browser DOM work, PNG rasterization or network time is measured.

On Node, four HTML cases take 23.1–43.7% less time; the fraction direction is
unestablished. On Bun, four HTML cases take 9.1–26.2% less time; the array
direction is unestablished. All five SVG cases take less time beyond the
controls: 88.7–97.2% on Node and 77.5–95.3% on Bun. These are five small
workloads, not a corpus-wide speed estimate or proof of equal typography.
The benchmark validates output shape; semantic/corpus and visual checks are
separate. MathJax speech/exploration is not enabled in this raw SVG comparison.

VLX has useful performance and React/image integration strengths for its
documented scope. KaTeX’s broader function catalog and MathJax’s speech, Braille
and interactive exploration remain separate capabilities. See the
[scope and acceptance limits](../../README.md) before treating this as a
general replacement recommendation.

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

Recorded 2026-11-08T19:26:19.896Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 35951 | 30816 | -15.4% | -15.4% | -9.5% | 2.4% | unestablished at this precision |
| SVG / fraction / uncached | 244033 | 27571 | -88.7% | -90.1% | -88.1% | 2.3% | lower time in every pair, beyond control spread |
| HTML / styled text / uncached | 55672 | 43947 | -23.1% | -25.1% | -18.7% | 6.1% | lower time in every pair, beyond control spread |
| SVG / styled text / uncached | 942179 | 38433 | -95.9% | -96% | -95.9% | 1.4% | lower time in every pair, beyond control spread |
| HTML / array / uncached | 55764 | 39160 | -29% | -24.2% | -29.8% | 5.9% | lower time in every pair, beyond control spread |
| SVG / array / uncached | 366667 | 37517 | -89.5% | -90.1% | -89.5% | 3.3% | lower time in every pair, beyond control spread |
| HTML / contest relations / uncached | 66097 | 37180 | -43.7% | -43.7% | -42.4% | 4.2% | lower time in every pair, beyond control spread |
| SVG / contest relations / uncached | 588039 | 37077 | -93.4% | -93.8% | -93.4% | 2.5% | lower time in every pair, beyond control spread |
| HTML / continued fraction and operators / uncached | 64018 | 42411 | -34.3% | -34.3% | -32.3% | 2.2% | lower time in every pair, beyond control spread |
| SVG / continued fraction and operators / uncached | 1452424 | 39517 | -97.2% | -97.4% | -97% | 3.6% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-08T19:27:25.978Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| HTML / fraction / uncached | 35891 | 32627 | -9.1% | -9.1% | -9.2% | 2.7% | lower time in every pair, beyond control spread |
| SVG / fraction / uncached | 146506 | 32834 | -77.5% | -79.7% | -75.4% | 7.8% | lower time in every pair, beyond control spread |
| HTML / styled text / uncached | 51720 | 45836 | -11.4% | -14.7% | -8.4% | 1.9% | lower time in every pair, beyond control spread |
| SVG / styled text / uncached | 689823 | 40903 | -94% | -95.2% | -92.9% | 6.5% | lower time in every pair, beyond control spread |
| HTML / array / uncached | 50614 | 43279 | -13.3% | -15% | -12.2% | 9.4% | unestablished at this precision |
| SVG / array / uncached | 278336 | 40775 | -85.2% | -86.8% | -84.1% | 15.3% | lower time in every pair, beyond control spread |
| HTML / contest relations / uncached | 59552 | 44811 | -26.2% | -27.2% | -26.2% | 5.3% | lower time in every pair, beyond control spread |
| SVG / contest relations / uncached | 396100 | 41526 | -89.6% | -91% | -88.1% | 4.4% | lower time in every pair, beyond control spread |
| HTML / continued fraction and operators / uncached | 61482 | 49976 | -20% | -20.8% | -17.9% | 3.8% | lower time in every pair, beyond control spread |
| SVG / continued fraction and operators / uncached | 991502 | 47568 | -95.3% | -95.9% | -94.8% | 4.1% | lower time in every pair, beyond control spread |

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
