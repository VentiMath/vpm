# Callback-ref measurements

use-callback-ref 1.3.3 and the independent VPM implementation, production React
19.1.0. Each case and implementation uses fresh processes: four balanced AB/BA
pairs and two identical-source control pairs, 150 ms warmup, twelve measured
blocks and matched iteration counts. Validation is outside timing. Raw samples,
PIDs and source hashes are retained. Direction is unestablished if pairs disagree
or any pair overlaps the largest absolute control difference (minimum 2%).
This is descriptive evidence, not a confidence interval or application speedup.

Mounted tests use jsdom and synchronous React rendering, not browser layout.
Small assignment timings can be heavily optimized by the engine.

## Node 24.22.1

Recorded 2026-11-02T16:07:42.460Z through 2026-11-02T16:08:13.058Z,
Apple M1 Pro, darwin/arm64.

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [create observable ref](node-0.json) | 180 | 180 | 2.4% | 20.3% | -13.4% | 30% | unestablished at this precision |
| [update and clear two merged refs](node-1.json) | 138 | 134 | -2.6% | 0.8% | -2.6% | 0.6% | unestablished at this precision |
| [cached callback ref assignment](node-2.json) | 16 | 8 | -49.8% | -50.2% | -49.8% | 14.3% | lower time in every pair, beyond control spread |
| [SSR with two merged refs](node-3.json) | 2143 | 2063 | -2.7% | 2.4% | -22.1% | 6% | unestablished at this precision |
| [mounted stable ref rerender](node-4.json) | 2495 | 2375 | -5.2% | -5.8% | -4% | 1.4% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-02T16:08:21.303Z through 2026-11-02T16:08:52.255Z,
Apple M1 Pro, darwin/arm64.

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [create observable ref](bun-0.json) | 32 | 36 | 14.1% | 14.1% | 17.7% | 5.6% | higher time in every pair, beyond control spread |
| [update and clear two merged refs](bun-1.json) | 40 | 22 | -44.6% | -52.4% | -42.2% | 0.7% | lower time in every pair, beyond control spread |
| [cached callback ref assignment](bun-2.json) | 3 | 2 | -16.6% | -16.2% | -24% | 0.7% | lower time in every pair, beyond control spread |
| [SSR with two merged refs](bun-3.json) | 1391 | 1514 | 2.7% | -3.3% | 6.2% | 118.3% | unestablished at this precision |
| [mounted stable ref rerender](bun-4.json) | 2274 | 2384 | 1% | -1.3% | 6.2% | 0.9% | unestablished at this precision |

Bun observable-ref creation remains slower: 32 → 36 ns (+14.1%). Cached callback
assignment improves on both runtimes; two-ref updates improve on Bun; mounted
rerendering improves modestly on Node. The other cases are inconclusive. No
correctness check is disabled for timing, and these results do not establish an
application responsiveness change.

## Reproduce

Install scripts/callback-ref-conformance and run its conformance check to prepare
the ignored React peer link, then run these commands serially:

```sh
node packages/vuse-callback-ref/bench/compare.cjs
bun packages/vuse-callback-ref/bench/compare.cjs
```

Each command writes five reports. Validate each report using
`require('./scripts/bench-process.cjs').verify(report, packageDirectory)` from
the repository root to check raw summaries, process balance and source hashes.
