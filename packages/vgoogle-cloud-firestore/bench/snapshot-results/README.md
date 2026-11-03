# vgoogle-cloud-firestore measurements

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

Recorded 2026-11-03T15:11:35.964Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Watch index initial 1000 documents | 285370 | 154054 | -46.9% | -47.1% | -45.8% | 0.7% | lower time in every pair, beyond control spread |
| Watch index 100 document moves in 1000 | 71572 | 34880 | -52.1% | -52.8% | -51% | 2% | lower time in every pair, beyond control spread |
| materialize retained 1000-document snapshot | 14488 | 7684 | -47.3% | -47% | -47.3% | 1.9% | lower time in every pair, beyond control spread |
| remove and restore middle of 10000 documents | 609 | 379 | -36% | -40.4% | -34.5% | 0.7% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-03T15:12:17.820Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Watch index initial 1000 documents | 341366 | 268475 | -22.7% | -19.3% | -24.6% | 4.2% | lower time in every pair, beyond control spread |
| Watch index 100 document moves in 1000 | 74294 | 52772 | -29% | -27.1% | -39.2% | 9.3% | lower time in every pair, beyond control spread |
| materialize retained 1000-document snapshot | 5657 | 5717 | 0.7% | 1.4% | -2.9% | 5.5% | unestablished at this precision |
| remove and restore middle of 10000 documents | 754 | 491 | -34.1% | -36.1% | -31.9% | 6.2% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/snapshot.cjs:

```sh
OUTPUT=packages/vgoogle-cloud-firestore/bench/snapshot-results/node-isolated.json node packages/vgoogle-cloud-firestore/bench/snapshot.cjs
OUTPUT=packages/vgoogle-cloud-firestore/bench/snapshot-results/bun-isolated.json bun packages/vgoogle-cloud-firestore/bench/snapshot.cjs
node scripts/render-bench-report.cjs packages/vgoogle-cloud-firestore snapshot-results snapshot.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
