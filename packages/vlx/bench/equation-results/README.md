# vlx measurements

The three existing-API cases compare VLX 0.2.0 with committed pre-feature VLX
`235846009f114f0f34189dc8ea4d76e4aa87dc7c`. None establishes a direction across
all pairs and controls. In particular, the Node uncached-formula median change
is +10.4%, but its identical-source control spread is 57.2%; this does not
establish either a regression or performance parity.

The two document cases compare complete parsing, numbering, forward-reference
resolution and output against initialized MathJax 4.1.3 with NewCM 4.1.3. VLX
emits SVG and MathML in HTML; MathJax emits SVG in HTML. VLX uses about 92% less
time in these synthetic workloads on both runtimes, beyond the observed control
spread. This is not identical output or a browser rendering/React benchmark;
initialization, layout/paint and screen-reader work are excluded.

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

Recorded 2026-11-06T03:44:01.102Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| existing uncached formula / prior VLX | 29792 | 32163 | 10.4% | 6% | 10.9% | 57.2% | unestablished at this precision |
| existing cached formula / prior VLX | 380 | 342 | -9.1% | -21.5% | -7.5% | 2.9% | unestablished at this precision |
| existing mixed text / prior VLX | 3491 | 3321 | -5.6% | -5.5% | -5.6% | 1.1% | unestablished at this precision |
| 2 numbered equations and forward refs / MathJax | 2285226 | 165750 | -92.2% | -93.7% | -91.3% | 15.7% | lower time in every pair, beyond control spread |
| 12 numbered equations and forward refs / MathJax | 9872922 | 782943 | -92.1% | -91.4% | -93% | 0.7% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-06T03:45:24.981Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| existing uncached formula / prior VLX | 32147 | 33101 | 3.4% | 3.4% | 1.5% | 1.7% | unestablished at this precision |
| existing cached formula / prior VLX | 139 | 138 | -0.3% | 0.3% | -0.8% | 1.1% | unestablished at this precision |
| existing mixed text / prior VLX | 4321 | 4348 | 1.4% | 1.4% | 9.2% | 0.8% | unestablished at this precision |
| 2 numbered equations and forward refs / MathJax | 1741664 | 142255 | -91.6% | -93% | -90.3% | 9.1% | lower time in every pair, beyond control spread |
| 12 numbered equations and forward refs / MathJax | 7649677 | 626684 | -91.8% | -92.7% | -91.2% | 6.1% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/equations.cjs:

```sh
node scripts/vlx-conformance/prepare-equation-baseline.cjs
OUTPUT=packages/vlx/bench/equation-results/node-isolated.json node packages/vlx/bench/equations.cjs
OUTPUT=packages/vlx/bench/equation-results/bun-isolated.json bun packages/vlx/bench/equations.cjs
node scripts/render-bench-report.cjs packages/vlx equation-results equations.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
