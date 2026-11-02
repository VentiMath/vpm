# Persistent snapshot index measurements

The original side executes the exact former Watch sequence: insertion followed
by find().index, or find().index followed by iterator removal. VPM obtains rank
and the new root in one search. No per-update wrapper objects are added to the
original tree. Snapshot materialization returns a new document array on both
sides. These are index CPU costs, not Firestore network latency.

Each implementation runs in a fresh process: four balanced AB/BA comparison
pairs and two identical-upstream control pairs, 150 ms warmup, 12 measurement
blocks and matched iteration counts. Results are validated outside timing.
Every sample is retained, along with source hashes and process IDs. A direction
is unestablished if it reverses or overlaps the largest absolute control
difference (minimum 2%). This is descriptive evidence, not a confidence interval.

## Node 24.22.1

Recorded 2026-11-02T08:56:26.739Z on Apple M1 Pro, darwin/arm64.
[Raw samples and source hashes](node.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Watch index initial 1000 documents | 341104 | 181535 | -45.7% | -48% | -21.8% | 59.1% | unestablished at this precision |
| Watch index 100 document moves in 1000 | 81619 | 41580 | -49.9% | -49.9% | -53.4% | 79.1% | unestablished at this precision |
| materialize retained 1000-document snapshot | 17260 | 9972 | -45.7% | -43.8% | -46.8% | 30.6% | lower time in every pair, beyond control spread |
| remove and restore middle of 10000 documents | 677 | 448 | -35.5% | -35.5% | -41.4% | 2.1% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-02T08:56:43.271Z on Apple M1 Pro, darwin/arm64.
[Raw samples and source hashes](bun.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Watch index initial 1000 documents | 409321 | 291508 | -33.2% | -32.4% | -38% | 7.6% | lower time in every pair, beyond control spread |
| Watch index 100 document moves in 1000 | 87618 | 62784 | -29% | -29% | -14.7% | 0.4% | unestablished at this precision |
| materialize retained 1000-document snapshot | 7015 | 6860 | -2.7% | -5.5% | 6.2% | 6.2% | unestablished at this precision |
| remove and restore middle of 10000 documents | 876 | 637 | -26.9% | -29.1% | -26.8% | 0.4% | lower time in every pair, beyond control spread |

## Reproduce

Install the pinned firestore-conformance fixture, then run serially:

```sh
OUTPUT=packages/vgoogle-cloud-firestore/bench/snapshot-results/node.json node packages/vgoogle-cloud-firestore/bench/snapshot.cjs
OUTPUT=packages/vgoogle-cloud-firestore/bench/snapshot-results/bun.json bun packages/vgoogle-cloud-firestore/bench/snapshot.cjs
```
