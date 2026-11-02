# Redux measurements

Redux 5.0.1 vs the independent runtime, production mode for both. The cases measure store CPU, not React rendering or application latency. Indexed reducer iteration removed the preliminary Bun combining regression without dropping own-key checks.

Each case and implementation runs in fresh processes: four balanced AB/BA
comparison pairs and two identical-upstream control pairs. Warmup is 150 ms,
followed by 12 measured blocks with matched iteration counts. Results are
validated outside timing; raw samples, PIDs and source hashes remain untrimmed.
A difference is unestablished if its direction reverses or any pair overlaps the
largest absolute control difference (minimum 2%). This is descriptive evidence,
not a confidence interval or a deployed application performance claim.

## Node 24.22.1

Recorded 2026-11-02T10:28:45.932Z through 2026-11-02T10:29:04.148Z
on Apple M1 Pro, darwin/arm64.

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [dispatch without listeners](node-0.json) | 47 | 14 | -69.7% | -68.4% | -69.7% | 1.4% | lower time in every pair, beyond control spread |
| [dispatch to eight listeners](node-1.json) | 110 | 30 | -72.8% | -73.1% | -72.8% | 2.5% | lower time in every pair, beyond control spread |
| [subscribe dispatch unsubscribe](node-2.json) | 146 | 75 | -48.9% | -48% | -48.9% | 4% | lower time in every pair, beyond control spread |
| [combine eight reducers and dispatch](node-3.json) | 441 | 423 | -2.7% | 1.4% | -7.8% | 1.9% | unestablished at this precision |
| [dispatch through four middleware](node-4.json) | 78 | 43 | -44.4% | -43.2% | -44.8% | 6.2% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-02T10:29:07.516Z through 2026-11-02T10:29:25.301Z
on Apple M1 Pro, darwin/arm64.

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [dispatch without listeners](bun-0.json) | 7 | 3 | -52.8% | -52.4% | -53% | 2.6% | lower time in every pair, beyond control spread |
| [dispatch to eight listeners](bun-1.json) | 123 | 22 | -82.1% | -81.7% | -82.5% | 4.3% | lower time in every pair, beyond control spread |
| [subscribe dispatch unsubscribe](bun-2.json) | 89 | 77 | -13.3% | -23.2% | -11% | 1.7% | lower time in every pair, beyond control spread |
| [combine eight reducers and dispatch](bun-3.json) | 81 | 83 | 1.7% | -1.8% | 2.7% | 1% | unestablished at this precision |
| [dispatch through four middleware](bun-4.json) | 19 | 13 | -32.7% | -30.5% | -32.7% | 10.2% | lower time in every pair, beyond control spread |

Dispatch, eight listeners, subscription churn and middleware improve beyond
controls on both runtimes. Eight-reducer combination is inconclusive on both.
Nanosecond-level bare dispatch can be heavily optimized by the engine; these
results do not predict a UI frame-rate change.

## Reproduce

Install the pinned conformance fixture, then run serially:

```sh
NODE_ENV=production node packages/vredux/bench/compare.cjs
NODE_ENV=production bun packages/vredux/bench/compare.cjs
```

Each command writes five reports. To validate raw-summary consistency, runtime,
balanced process order and current source hashes, call
`require('./scripts/bench-process.cjs').verify(report, packageDirectory)` from the
repository root.
