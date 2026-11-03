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

Recorded 2026-11-03T17:41:35.514Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| encode / 12-field document | 4353 | 3956 | -8.6% | -8.4% | -9.3% | 1% | lower time in every pair, beyond control spread |
| decode / snapshot data() of 12-field document | 7337 | 8581 | 17.4% | 17.4% | 17% | 1.7% | higher time in every pair, beyond control spread |
| write / compile batch merge with transforms | 45981 | 13981 | -69.8% | -69.8% | -69.3% | 2% | lower time in every pair, beyond control spread |
| query / where, orderBy, limit to proto | 2054 | 1263 | -38.5% | -38% | -38.5% | 4.1% | lower time in every pair, beyond control spread |
| compare / isEqual of independently read equal snapshots | 9159 | 7983 | -12.8% | -13.4% | -12.8% | 2.1% | lower time in every pair, beyond control spread |
| timestamp / fromMillis, toDate, valueOf | 82 | 83 | 2.4% | 1.8% | 13.7% | 2.5% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-03T17:42:00.998Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| encode / 12-field document | 4463 | 3087 | -30.9% | -31.7% | -29.4% | 2.7% | lower time in every pair, beyond control spread |
| decode / snapshot data() of 12-field document | 3870 | 5525 | 42.4% | 45.5% | 40.1% | 32.7% | higher time in every pair, beyond control spread |
| write / compile batch merge with transforms | 32284 | 20453 | -36.6% | -18.5% | -37% | 0.9% | unestablished at this precision |
| query / where, orderBy, limit to proto | 1945 | 1796 | -7.8% | -6.5% | -8.9% | 2.9% | lower time in every pair, beyond control spread |
| compare / isEqual of independently read equal snapshots | 10624 | 6046 | -43.1% | -44.1% | -42.4% | 1.2% | lower time in every pair, beyond control spread |
| timestamp / fromMillis, toDate, valueOf | 60 | 83 | 38.8% | 38.8% | 37.8% | 2.2% | higher time in every pair, beyond control spread |

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
