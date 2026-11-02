# vgoogle-cloud-firestore measurements

Historical recording from before the independent snapshot index replaced the
general tree dependency. The retained source hashes describe that earlier build.
Current Watch index measurements are [recorded separately](../snapshot-results/README.md);
these earlier SDK timings are not a fresh measurement of the changed runtime.

These records supersede the earlier same-process comparison. Each timed
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
Negative changes mean less time; these are local CPU measurements, not
application throughput or latency guarantees.

## Node 24.22.1

Recorded 2026-11-01T10:29:07.210Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| encode / 12-field document | 3830 | 3868 | 1% | -0.7% | 2.5% | 5.1% | unestablished at this precision |
| decode / snapshot data() of 12-field document | 6443 | 6616 | 2.7% | 2.7% | 1.3% | 6.2% | unestablished at this precision |
| write / batch set merge with transforms | 30508 | 30946 | 2% | 1.4% | 2.5% | 5.4% | unestablished at this precision |
| query / where, orderBy, limit to proto | 1792 | 1851 | 4% | 4% | 4.1% | 1.3% | unestablished at this precision |
| compare / isEqual of equal snapshots | 63 | 62 | -0.6% | -0.6% | -0.3% | 14.7% | unestablished at this precision |
| timestamp / fromMillis, toDate, valueOf | 71 | 73 | 3.7% | 5.6% | 2.6% | 3.5% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T10:29:32.722Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| encode / 12-field document | 3860 | 3983 | 4% | 3.1% | 7.6% | 35.5% | unestablished at this precision |
| decode / snapshot data() of 12-field document | 3422 | 3608 | 4% | 7.2% | 1.4% | 3.7% | unestablished at this precision |
| write / batch set merge with transforms | 19269 | 19458 | 0% | -1.3% | 6.7% | 3.3% | unestablished at this precision |
| query / where, orderBy, limit to proto | 1715 | 1922 | 11.3% | 11.3% | 117.4% | 6.7% | higher time in every pair, beyond control spread |
| compare / isEqual of equal snapshots | 60 | 107 | 61.6% | 57.9% | 100% | 9.1% | unestablished at this precision |
| timestamp / fromMillis, toDate, valueOf | 52 | 56 | 6.7% | -4.1% | 22.6% | 8.2% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vgoogle-cloud-firestore/bench/results/node-isolated.json node packages/vgoogle-cloud-firestore/bench/compare.cjs
OUTPUT=packages/vgoogle-cloud-firestore/bench/results/bun-isolated.json bun packages/vgoogle-cloud-firestore/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vgoogle-cloud-firestore
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
