# gRPC decoder measurements

grpc-js 1.14.7 vs the independent frame decoder. Decoder instances and input chunks are reused; returned buffers are independently owned. These are framing CPU measurements, not network latency or whole-transport results. The final growth policy accounts for the five-byte header separately, avoiding a near-full-size reallocation at the end of a power-of-two payload.

Each case and implementation runs in fresh processes: four balanced AB/BA
comparison pairs and two identical-upstream control pairs. Warmup is 150 ms,
followed by 12 measured blocks with matched iteration counts. Results are
validated outside timing; raw samples, PIDs and source hashes remain untrimmed.
A difference is unestablished if its direction reverses or any pair overlaps the
largest absolute control difference (minimum 2%). This is descriptive evidence,
not a confidence interval or a deployed application performance claim.

## Node 24.22.1

Recorded 2026-11-02T10:29:30.157Z through 2026-11-02T10:29:48.684Z
on Apple M1 Pro, darwin/arm64.

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [complete 128B](node-0.json) | 315 | 99 | -69.8% | -70.3% | -68.2% | 0.9% | lower time in every pair, beyond control spread |
| [complete 16KiB](node-1.json) | 821 | 800 | 0.3% | 0.3% | 2.2% | 13.8% | unestablished at this precision |
| [coalesced 16 x 128B](node-2.json) | 4867 | 1310 | -73.1% | -72.9% | -73.3% | 8.5% | lower time in every pair, beyond control spread |
| [fragmented 16KiB / 1KiB writes](node-3.json) | 1755 | 1508 | -15% | -16.5% | -12.5% | 1.9% | lower time in every pair, beyond control spread |
| [fragmented 4KiB / one-byte writes](node-4.json) | 207793 | 86888 | -58.2% | -58.2% | -58% | 0.3% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-02T10:29:53.241Z through 2026-11-02T10:30:10.660Z
on Apple M1 Pro, darwin/arm64.

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| [complete 128B](bun-0.json) | 150 | 69 | -54.6% | -53% | -54.6% | 2.4% | lower time in every pair, beyond control spread |
| [complete 16KiB](bun-1.json) | 1007 | 870 | -14.9% | -14.9% | -14.3% | 6.7% | unestablished at this precision |
| [coalesced 16 x 128B](bun-2.json) | 2236 | 932 | -58.5% | -56.9% | -59.4% | 4.3% | lower time in every pair, beyond control spread |
| [fragmented 16KiB / 1KiB writes](bun-3.json) | 1676 | 1920 | 16% | 14.1% | 18.7% | 28.7% | unestablished at this precision |
| [fragmented 4KiB / one-byte writes](bun-4.json) | 248855 | 144336 | -41.9% | -41.9% | -48.8% | 3.3% | lower time in every pair, beyond control spread |

The Bun 16 KiB fragmented case records 1,676 → 1,920 ns (+16% median
paired change), with a 28.7% identical-source control spread. That possible cost
remains visible; this recording does not establish a directional difference.
Both complete 16 KiB cases are also inconclusive. Small/coalesced frames and
one-byte fragmentation improve beyond controls on both runtimes; ordinary
fragmentation improves on Node.

## Reproduce

Install the pinned conformance fixture, then run serially:

```sh
node packages/vgrpc-js/bench/decoder.cjs
bun packages/vgrpc-js/bench/decoder.cjs
```

Each command writes five reports. To validate raw-summary consistency, runtime,
balanced process order and current source hashes, call
`require('./scripts/bench-process.cjs').verify(report, packageDirectory)` from the
repository root.
