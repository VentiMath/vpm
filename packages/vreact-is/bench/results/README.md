# vreact-is measurements

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

Recorded 2026-11-01T19:58:04.424Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| isFragment / ordinary child | 1 | 1 | 87.2% | 174.1% | -0.2% | 5.4% | unestablished at this precision |
| isFragment / fragment | 6 | 4 | -30.3% | -21.2% | -30.3% | 11.9% | unestablished at this precision |
| isElement / element | 9 | 8 | -3.6% | 3.9% | -7.1% | 7.7% | unestablished at this precision |
| isValidElementType / host | 8 | 8 | 1.5% | 13% | -9.9% | 12.6% | unestablished at this precision |
| isValidElementType / memo | 10 | 10 | -1.1% | 6% | -7.6% | 9.2% | unestablished at this precision |
| typeOf / host | 11 | 10 | -7.9% | -3.8% | -12% | 7.4% | unestablished at this precision |
| typeOf / memo | 11 | 11 | -5.8% | 5.4% | -10.8% | 6.8% | unestablished at this precision |
| isMemo / memo element | 12 | 11 | -10% | -5.2% | -12.8% | 4.5% | unestablished at this precision |
| isPortal / ordinary child | 11 | 8 | -25.6% | -20.2% | -31.2% | 6.1% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T19:58:32.880Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| isFragment / ordinary child | 2 | 1 | -61.3% | -39.6% | -64.1% | 14.6% | lower time in every pair, beyond control spread |
| isFragment / fragment | 3 | 3 | -19% | -17.6% | -19% | 169.5% | unestablished at this precision |
| isElement / element | 3 | 8 | 171.3% | 353.1% | -0.6% | 105.5% | unestablished at this precision |
| isValidElementType / host | 4 | 6 | 40% | 118.3% | 21.4% | 14.5% | higher time in every pair, beyond control spread |
| isValidElementType / memo | 7 | 8 | 13% | 13.5% | 11.5% | 10% | unestablished at this precision |
| typeOf / host | 7 | 10 | 47.8% | 117.6% | -19.3% | 15.1% | unestablished at this precision |
| typeOf / memo | 8 | 16 | 96.8% | 96.8% | 80.3% | 0.6% | unestablished at this precision |
| isMemo / memo element | 9 | 9 | -5.6% | -0.7% | -8.3% | 9.2% | unestablished at this precision |
| isPortal / ordinary child | 9 | 7 | -25.9% | -23.3% | -27.3% | 2% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vreact-is/bench/results/node-isolated.json node packages/vreact-is/bench/compare.cjs
OUTPUT=packages/vreact-is/bench/results/bun-isolated.json bun packages/vreact-is/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vreact-is
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.

## Initial implementation

The first recording exposed Node classification regressions. The subsequent
implementation uses private lexical bindings and fewer helper calls; it retains
the same getter behavior and passes the same conformance checks. The original
[Node recording](initial-node.json), [Bun recording](initial-bun.json) and
[runtime snapshot](initial-runtime.mjs) are retained. Only the runtime hash differs
from the final recordings; the benchmark cases and all other measured inputs are
unchanged. These initial results describe the superseded implementation.
