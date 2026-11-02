# Channelz registry measurements

Each implementation runs in a fresh process: four balanced AB/BA comparison pairs
and two identical-upstream control pairs, 150 ms warmup and 12 blocks with matched
iteration counts. Results are checked outside timing. All samples, process IDs and
source hashes are retained. A direction is unestablished if it reverses or overlaps
the largest absolute control difference (minimum 2%). This is descriptive evidence,
not a confidence interval or a whole-application performance guarantee.

The actual upstream and VPM Channelz handlers run with fresh registries. These
measure diagnostic paging and registry updates, not HTTP/2 payload throughput.
Paging avoids general iterator proxies and pair allocations; empty child lists
return immediately. Normal reference updates improve on both runtimes. Repeated
remove/restore of the middle ID among 10,000 live children remains more expensive
on Bun: 138 → 279 ns (about 141 ns extra). Node has no established change for that
stress case. Bun paging among 10,000 channels is inconclusive against its controls
despite a lower median; every case is retained below.

## Node 24.22.1

Recorded 2026-11-02T07:28:17.135Z on Apple M1 Pro, darwin/arm64.
[Raw samples and source hashes](node.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| page 100 of 100 channels | 15893 | 2973 | -81.4% | -82.4% | -80.4% | 1.7% | lower time in every pair, beyond control spread |
| page 100 of 10000 channels | 16600 | 3283 | -79.4% | -82% | -78.3% | 10.2% | lower time in every pair, beyond control spread |
| register and unregister channel | 44 | 23 | -47.9% | -42.3% | -48.4% | 7.7% | lower time in every pair, beyond control spread |
| child reference and release | 207 | 24 | -88.2% | -87.9% | -88.4% | 16.6% | lower time in every pair, beyond control spread |
| remove and restore middle of 10000 children | 196 | 207 | 10.3% | 10.3% | 8.4% | 13.7% | unestablished at this precision |
| first page after churn among 10000 channels | 19251 | 4090 | -78.9% | -78.9% | -76.6% | 17.2% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-02T07:28:44.974Z on Apple M1 Pro, darwin/arm64.
[Raw samples and source hashes](bun.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| page 100 of 100 channels | 18179 | 5647 | -68.9% | -71.6% | -66.8% | 5.7% | lower time in every pair, beyond control spread |
| page 100 of 10000 channels | 16821 | 6839 | -59.8% | -30.7% | -61.1% | 17.4% | unestablished at this precision |
| register and unregister channel | 34 | 32 | -5.2% | -3.9% | -5.2% | 2.9% | unestablished at this precision |
| child reference and release | 148 | 24 | -83.9% | -83.9% | -83.9% | 1.1% | lower time in every pair, beyond control spread |
| remove and restore middle of 10000 children | 138 | 279 | 100.5% | 117.9% | 83% | 11.9% | higher time in every pair, beyond control spread |
| first page after churn among 10000 channels | 16205 | 6004 | -61.7% | -59.7% | -64.8% | 22.9% | lower time in every pair, beyond control spread |

## Reproduce

Install the pinned grpc-conformance fixture, then run serially:

```sh
OUTPUT=packages/vgrpc-js/bench/channelz-results/node.json node packages/vgrpc-js/bench/channelz.cjs
OUTPUT=packages/vgrpc-js/bench/channelz-results/bun.json bun packages/vgrpc-js/bench/channelz.cjs
```
