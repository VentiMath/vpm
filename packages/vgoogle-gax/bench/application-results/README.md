# vgoogle-gax measurements

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

Recorded 2026-11-03T03:17:48.083Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| settings merge / retry and headers | 42 | 132 | 215.3% | 317.7% | 215.3% | 44.2% | higher time in every pair, beyond control spread |
| resource path / repeated render | 602 | 306 | -49.1% | -50.8% | -49.1% | 46.1% | unestablished at this precision |
| Firestore schema / cached gRPC descriptors | 160149 | 162501 | 1.4% | 12.7% | 1.1% | 10.2% | unestablished at this precision |
| Firestore SDK / unary document | 318272 | 325972 | 15.9% | 99.7% | -0.5% | 61.6% | unestablished at this precision |
| Firestore SDK / batch read stream | 305737 | 302230 | -1.1% | 38.3% | -7% | 47.4% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-03T03:18:14.950Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| settings merge / retry and headers | 70 | 153 | 117.4% | 117.4% | 116.7% | 33.2% | higher time in every pair, beyond control spread |
| resource path / repeated render | 526 | 95 | -82.7% | -80.7% | -83% | 100.1% | unestablished at this precision |
| Firestore schema / cached gRPC descriptors | 80940 | 82552 | 2% | -0.4% | 5.3% | 176.8% | unestablished at this precision |
| Firestore SDK / unary document | 135064 | 139615 | 6.5% | -4.1% | 22.4% | 86% | unestablished at this precision |
| Firestore SDK / batch read stream | 151829 | 132344 | -15.1% | -12.8% | -19.5% | 67.2% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/application.cjs:

```sh
OUTPUT=packages/vgoogle-gax/bench/application-results/node-isolated.json node packages/vgoogle-gax/bench/application.cjs
OUTPUT=packages/vgoogle-gax/bench/application-results/bun-isolated.json bun packages/vgoogle-gax/bench/application.cjs
node scripts/render-bench-report.cjs packages/vgoogle-gax application-results application.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
