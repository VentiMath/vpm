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

Recorded 2026-11-03T15:11:18.966Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| encode / 12-field document | 3648 | 3281 | -9.8% | -9.8% | -10% | 1% | lower time in every pair, beyond control spread |
| decode / snapshot data() of 12-field document | 6187 | 9395 | 51.9% | 51.7% | 51.9% | 0.9% | higher time in every pair, beyond control spread |
| write / compile batch merge with transforms | 38594 | 11833 | -69.4% | -69.5% | -69.4% | 1.4% | lower time in every pair, beyond control spread |
| query / where, orderBy, limit to proto | 1699 | 1067 | -37.6% | -37% | -37.8% | 4.7% | lower time in every pair, beyond control spread |
| compare / isEqual of independently read equal snapshots | 7600 | 6652 | -13.1% | -13.1% | -12.9% | 1.6% | lower time in every pair, beyond control spread |
| timestamp / fromMillis, toDate, valueOf | 69 | 69 | 0.4% | 6.2% | -0.5% | 2.5% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-03T15:12:01.373Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| encode / 12-field document | 3769 | 2665 | -28.8% | -30.2% | -28.6% | 2% | lower time in every pair, beyond control spread |
| decode / snapshot data() of 12-field document | 3239 | 7057 | 113.3% | 119.3% | 111.3% | 1.7% | higher time in every pair, beyond control spread |
| write / compile batch merge with transforms | 27629 | 17385 | -37.1% | -37.4% | -35.8% | 3.2% | lower time in every pair, beyond control spread |
| query / where, orderBy, limit to proto | 1664 | 1544 | -7.7% | -3.2% | -7.7% | 1.7% | unestablished at this precision |
| compare / isEqual of independently read equal snapshots | 8934 | 5215 | -40.8% | -40.8% | -40.8% | 1.7% | lower time in every pair, beyond control spread |
| timestamp / fromMillis, toDate, valueOf | 52 | 72 | 43.3% | 43.3% | 44.4% | 2% | higher time in every pair, beyond control spread |

## Work represented

Write cases include deferred upstream serialization, so both sides produce the
compiled write. Snapshot equality uses two independent protocol responses,
avoiding a shared-input identity shortcut. Snapshot materialization includes
VPM's copy of caller-owned data; upstream retains those references. The encoding
case uses each SDK's internal encoder, so it does not include upstream's separate
public-write validation. End-to-end write construction is reported separately.

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
