# CSS box model measurements

Each benchmark case and implementation gets fresh processes: four balanced
AB/BA comparison pairs and two identical-upstream control pairs per case. Workers
never time earlier cases, so previous default/explicit object shapes cannot
affect the parsing case. Warmup is 150 ms, with 12 measured blocks and matched
iteration counts. Results are checked outside timing. Raw samples, process IDs
and source hashes are retained without trimming. A direction is unestablished
if it reverses or overlaps the largest absolute control difference (minimum 2%).
This is descriptive evidence, not a confidence interval.

A preliminary multi-case-worker run produced a Node parsing slowdown that
disappeared with case isolation on the same runtime source. Those preliminary
figures are not performance evidence for this implementation. The final records
below use case isolation throughout. Geometry CPU is measured, not browser
layout, frame rate or application latency. Separate default spacing records
require additional allocations; those costs remain visible.

## Node 24.22.1

Recorded 2026-11-02T08:58:49.461Z through 2026-11-02T08:59:06.978Z
on Apple M1 Pro, darwin/arm64.

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [rectangle from four edges](node-0.json) | 9 | 9 | 1.8% | 28.9% | -21.6% | 24.7% | unestablished at this precision |
| [create box with explicit spacing](node-1.json) | 33 | 31 | -6.6% | -12.5% | -4.1% | 5.6% | unestablished at this precision |
| [create box with default spacing](node-2.json) | 35 | 39 | 12.4% | 12.1% | 15.5% | 4.8% | higher time in every pair, beyond control spread |
| [parse computed style and calculate box](node-3.json) | 672 | 660 | -1.4% | -2.6% | 2.7% | 3.4% | unestablished at this precision |
| [calculate client and scrolled page boxes](node-4.json) | 748 | 740 | -1.9% | -2.2% | 1.9% | 21.4% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-02T08:59:11.245Z through 2026-11-02T08:59:27.742Z
on Apple M1 Pro, darwin/arm64.

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [rectangle from four edges](bun-0.json) | 13 | 13 | 0.1% | -8.6% | 2.8% | 8.3% | unestablished at this precision |
| [create box with explicit spacing](bun-1.json) | 87 | 85 | -0.8% | -0.5% | -12.2% | 18.9% | unestablished at this precision |
| [create box with default spacing](bun-2.json) | 75 | 90 | 19.9% | 19.8% | 19.9% | 21.8% | unestablished at this precision |
| [parse computed style and calculate box](bun-3.json) | 495 | 492 | -0.5% | -0.5% | -2.3% | 8.8% | unestablished at this precision |
| [calculate client and scrolled page boxes](bun-4.json) | 721 | 639 | -5.3% | -21.4% | 0.6% | 15.6% | unestablished at this precision |

## Reproduce

Install the pinned box-model-conformance fixture, then run serially. Each command
writes five case-specific JSON reports.

```sh
node packages/vcss-box-model/bench/compare.cjs
bun packages/vcss-box-model/bench/compare.cjs
```
