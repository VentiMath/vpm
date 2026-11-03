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

Recorded 2026-11-03T18:16:21.877Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| encode / 12-field document | 4367 | 3961 | -9.5% | -8.5% | -11.6% | 0.9% | lower time in every pair, beyond control spread |
| decode / snapshot data() of 12-field document | 7417 | 6435 | -12.9% | -9.6% | -13.7% | 0.9% | lower time in every pair, beyond control spread |
| decode / protobuf-decoded document with exact int64 | 12977 | 7721 | -40.7% | -40.7% | -45% | 0.3% | lower time in every pair, beyond control spread |
| decode / fresh data from a retained snapshot | 7104 | 2994 | -58.2% | -58.7% | -56.2% | 2.6% | lower time in every pair, beyond control spread |
| write / compile batch merge with transforms | 45834 | 13546 | -70.6% | -70.7% | -69.9% | 1.2% | lower time in every pair, beyond control spread |
| query / where, orderBy, limit to proto | 2037 | 1188 | -41.6% | -41.6% | -42.1% | 2.6% | lower time in every pair, beyond control spread |
| compare / isEqual of independently read equal snapshots | 9056 | 7930 | -12.5% | -11.4% | -12.6% | 4% | lower time in every pair, beyond control spread |
| timestamp / fromMillis, toDate, valueOf | 82 | 67 | -17% | -16.8% | -17% | 1.1% | lower time in every pair, beyond control spread |
| timestamp / mixed signed seconds and fractions | 242 | 174 | -27.8% | -27.5% | -28.7% | 1.3% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-03T18:16:58.141Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| encode / 12-field document | 4468 | 2886 | -36.3% | -37.4% | -22.5% | 1.8% | lower time in every pair, beyond control spread |
| decode / snapshot data() of 12-field document | 3911 | 4004 | 2.3% | 3.8% | 1.8% | 2.6% | unestablished at this precision |
| decode / protobuf-decoded document with exact int64 | 10498 | 5613 | -46.9% | -40.7% | -48.9% | 3.7% | lower time in every pair, beyond control spread |
| decode / fresh data from a retained snapshot | 3739 | 1943 | -48.4% | -47.6% | -49% | 1% | lower time in every pair, beyond control spread |
| write / compile batch merge with transforms | 32885 | 21813 | -33.5% | -35.1% | -33.5% | 4% | lower time in every pair, beyond control spread |
| query / where, orderBy, limit to proto | 2058 | 1835 | -10.1% | -32.7% | -5.3% | 1.9% | lower time in every pair, beyond control spread |
| compare / isEqual of independently read equal snapshots | 10788 | 6037 | -44% | -47.8% | -41.6% | 3.7% | lower time in every pair, beyond control spread |
| timestamp / fromMillis, toDate, valueOf | 62 | 59 | -17.9% | -18.5% | 63.3% | 1.9% | unestablished at this precision |
| timestamp / mixed signed seconds and fractions | 132 | 81 | -38.3% | -44.2% | -34.6% | 3% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vgoogle-cloud-firestore/bench/results/node-isolated.json node packages/vgoogle-cloud-firestore/bench/compare.cjs
OUTPUT=packages/vgoogle-cloud-firestore/bench/results/bun-isolated.json bun packages/vgoogle-cloud-firestore/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vgoogle-cloud-firestore results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
