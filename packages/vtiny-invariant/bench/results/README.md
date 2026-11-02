# vtiny-invariant measurements

Each implementation runs in a fresh process: four balanced AB/BA comparison pairs
and two identical-upstream control pairs, 150 ms warmup and 12 blocks with matched
iteration counts. Results are checked outside timing. All samples, process IDs and
source hashes are retained. A direction is unestablished if it reverses or overlaps
the largest absolute control difference (minimum 2%). This is descriptive evidence,
not a confidence interval or a whole-application performance guarantee.

These are assertion CPU costs, including throwing and catching an error in the
failure cases. Node changes are inconclusive against controls. Bun development
failure and production success have lower time beyond controls; the latter is a
few nanoseconds per assertion. No application speedup is claimed.

## Node 24.22.1

Recorded 2026-11-02T07:07:43.849Z on Apple M1 Pro, darwin/arm64.
[Raw samples and source hashes](node.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| development success | 5 | 5 | -14.1% | -14.1% | -9.4% | 5.2% | unestablished at this precision |
| development failure with lazy message | 3075 | 2592 | -14.3% | -38.1% | 17% | 37.1% | unestablished at this precision |
| production success | 12 | 11 | -4% | -1.4% | -14.3% | 2% | unestablished at this precision |
| production failure with lazy message | 3410 | 3013 | -11.7% | -14.2% | -6.8% | 3.7% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-02T07:07:56.688Z on Apple M1 Pro, darwin/arm64.
[Raw samples and source hashes](bun.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| development success | 1 | 1 | -0.1% | -1.2% | 1.8% | 1% | unestablished at this precision |
| development failure with lazy message | 489 | 422 | -13.6% | -15.8% | -10.1% | 1.8% | lower time in every pair, beyond control spread |
| production success | 5 | 3 | -34.9% | -34.1% | -35.2% | 4.1% | lower time in every pair, beyond control spread |
| production failure with lazy message | 402 | 396 | -1.3% | -1.3% | 0% | 4.5% | unestablished at this precision |

## Reproduce

Install the pinned invariant-conformance fixture, then run serially:

```sh
OUTPUT=packages/vtiny-invariant/bench/results/node.json node packages/vtiny-invariant/bench/compare.cjs
OUTPUT=packages/vtiny-invariant/bench/results/bun.json bun packages/vtiny-invariant/bench/compare.cjs
```
