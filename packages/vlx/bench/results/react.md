# VLX React rerender measurements: r5 → r6

The baseline is the immutable `vlx-0.1.0-r5` archive from commit `1289a87`.
The candidate is the r6 React mounting fix. Both use React 19.1.0 and jsdom
27.4.0 with preloaded rendering, synthetic formulas and synchronous parent
updates. This measures React/DOM work, not browser paint, cold loading, the
VentiMath test suite or production latency.

Four comparison pairs alternate execution order; two independent pairs compare
identical baseline code. Each timed implementation runs in a fresh process.
Iterations match within each pair; all raw samples and source hashes are retained.
A direction is established only if every comparison exceeds the largest absolute
control difference (with a 2% floor). This is a descriptive check, not a confidence
interval. Controls were noisy, especially on Node.

Unchanged parent updates are lower in every pair beyond control spread. Changed
TeX still replaces the formula: its measured medians are higher on both runtimes,
but the differences do not consistently exceed control variation. No speedup or
confirmed regression is established for that case.

## Node 24.22.1

Recorded 2026-11-04T07:50:20.573Z on Apple M1 Pro. [Raw samples](react-node.json).

| Case | r5 µs/update | r6 µs/update | Paired change | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| unchanged single formula | 1289.8 | 25.2 | -97.8% | 55% | lower time in every pair, beyond control spread |
| unchanged 20-formula paper | 22179.3 | 189.9 | -99.2% | 1.8% | lower time in every pair, beyond control spread |
| changed formula | 1202.2 | 1537.8 | 19.1% | 36.7% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-04T07:53:58.939Z on Apple M1 Pro. [Raw samples](react-bun.json).

| Case | r5 µs/update | r6 µs/update | Paired change | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| unchanged single formula | 845.5 | 10.9 | -98.8% | 4% | lower time in every pair, beyond control spread |
| unchanged 20-formula paper | 19877.1 | 55.7 | -99.7% | 12.7% | lower time in every pair, beyond control spread |
| changed formula | 924.3 | 1083.1 | 10.9% | 12.3% | unestablished at this precision |

## Browser regression controls

Chrome uses four formulas across InlineMath, DisplayMath and MathText.
In the first 20 parent updates, r5 writes HTML 80 times and loses focus/scroll.
Memoizing only the markup prop still writes four times during one lazy remount
and loses focus/scroll. r6 keeps every formula node, focus and scroll with zero
HTML writes across 60 updates per mode, both lazy and preloaded. Changed TeX,
provider defaults, failed-chunk error boundaries and unmount are also checked.
These deterministic checks supplement the synthetic timing results.

Reproduce with `OUTPUT=/absolute/path/result.json node scripts/vlx-conformance/bench-react.cjs /absolute/path/to/r5/vlx-0.1.0.tgz`, or use Bun.
