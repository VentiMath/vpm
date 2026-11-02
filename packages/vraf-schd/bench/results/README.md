# vraf-schd measurements

Each timed implementation runs in a fresh process: four balanced AB/BA comparison
pairs, then two identical-upstream control pairs. Each case warms for at least
150 ms, recalibrates, and records 12 blocks with matched iteration counts. Results
are checked outside timing; all samples, process IDs and source hashes are retained.
A direction is unestablished if it reverses or overlaps the largest absolute
control difference (minimum 2%). This is descriptive evidence, not a confidence
interval or a guarantee of whole-application performance.

Cycles use a deterministic frame provider and include schedule plus callback
delivery (16 calls in the coalescing case; cancel/reschedule in the cancellation
case). These are CPU costs, not browser frame latency. The ticket/lifecycle checks
add small costs; coalescing has no established change on either runtime.

## Node 24.22.1

Recorded 2026-11-02T05:35:54.391Z on Apple M1 Pro, darwin/arm64.
[Raw samples and source hashes](node.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| single frame cycle | 24 | 30 | 28.2% | 49% | 17.3% | 7% | higher time in every pair, beyond control spread |
| coalesce frame cycle | 155 | 143 | -7.4% | -7.4% | 8.9% | 32.4% | unestablished at this precision |
| cancel frame cycle | 42 | 52 | 19.9% | 18.8% | 25.7% | 7.1% | higher time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-02T05:36:07.005Z on Apple M1 Pro, darwin/arm64.
[Raw samples and source hashes](bun.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| single frame cycle | 25 | 36 | 43.3% | 46.3% | 35.7% | 16.8% | higher time in every pair, beyond control spread |
| coalesce frame cycle | 128 | 129 | 0.1% | 4% | 0.1% | 9.2% | unestablished at this precision |
| cancel frame cycle | 43 | 62 | 39.9% | 39.9% | 47.5% | 67.7% | unestablished at this precision |

## Reproduce

Install the pinned comparison fixture, then run serially:

```sh
OUTPUT=packages/vraf-schd/bench/results/node.json node packages/vraf-schd/bench/compare.cjs
OUTPUT=packages/vraf-schd/bench/results/bun.json bun packages/vraf-schd/bench/compare.cjs
```
