# vfast-deep-equal measurements

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

Recorded 2026-11-01T07:03:42.813Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| primitive / equal | 1 | 1 | -0.1% | -1% | -0.1% | 0.6% | unestablished at this precision |
| record / small equal | 107 | 94 | -11.7% | -12.5% | -3.5% | 3% | unestablished at this precision |
| record / changed value | 67 | 52 | -22.6% | -22.6% | -8.9% | 0.6% | unestablished at this precision |
| record / missing key | 32 | 32 | 2.2% | 3.4% | 1.2% | 1.8% | unestablished at this precision |
| record / nested 64 fields | 15134 | 14205 | -6.1% | -46.7% | -5.3% | 7.7% | unestablished at this precision |
| array / 32 records | 2833 | 2553 | -9.6% | -9.4% | -9.6% | 1.1% | lower time in every pair, beyond control spread |
| Buffer / equal 1KiB | 302 | 107 | -64.9% | -64.6% | -65% | 1.9% | lower time in every pair, beyond control spread |
| Map / nested 32 entries | 5231 | 5395 | 5.2% | -8.5% | 20.3% | 3.3% | unestablished at this precision |
| Set / 32 primitives | 425 | 346 | -18.5% | -19.1% | -18.5% | 4.9% | lower time in every pair, beyond control spread |
| React / equal element | 192 | 180 | -6.3% | -8.9% | -6.2% | 1.9% | lower time in every pair, beyond control spread |
| Firestore / equal document | 1221 | 1145 | -6.2% | -11% | -5.4% | 2.5% | lower time in every pair, beyond control spread |
| Firestore / changed document | 1097 | 1021 | -7.4% | -7.9% | -5% | 2.3% | lower time in every pair, beyond control spread |
| Firestore / equal query | 1333 | 1216 | -8.5% | -8% | -10.8% | 0.6% | lower time in every pair, beyond control spread |
| Firestore / changed filter | 206 | 201 | -2.6% | -4.1% | -0.8% | 125.9% | unestablished at this precision |
| Firestore / arrayUnion | 123 | 114 | -7.6% | -8.7% | -6.5% | 33.4% | unestablished at this precision |
| Firestore / arrayRemove | 114 | 114 | -0.4% | -1.5% | 0% | 20.6% | unestablished at this precision |
| Firestore / aggregate query | 1735 | 1603 | -7.8% | -9% | -7.8% | 3% | lower time in every pair, beyond control spread |

## Bun 1.4.0

Recorded 2026-11-01T07:04:51.460Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| primitive / equal | 1 | 1 | -0.2% | -0.1% | -1.3% | 1.8% | unestablished at this precision |
| record / small equal | 48 | 43 | -10.9% | -6.6% | -14.4% | 5.4% | unestablished at this precision |
| record / changed value | 39 | 34 | -12% | 1% | -24.8% | 14% | unestablished at this precision |
| record / missing key | 33 | 35 | 7.6% | 39.2% | -22.6% | 41.7% | unestablished at this precision |
| record / nested 64 fields | 4779 | 4588 | -3.9% | -2.7% | -5.2% | 1.3% | lower time in every pair, beyond control spread |
| array / 32 records | 1245 | 1191 | -4.4% | -4.3% | -4.7% | 184.1% | unestablished at this precision |
| Buffer / equal 1KiB | 427 | 57 | -86.6% | -86.3% | -87.7% | 25.4% | lower time in every pair, beyond control spread |
| Map / nested 32 entries | 3001 | 2756 | -7.7% | -8.2% | -4.5% | 1.8% | unestablished at this precision |
| Set / 32 primitives | 293 | 245 | -16.5% | -17.2% | -15.1% | 0.4% | lower time in every pair, beyond control spread |
| React / equal element | 84 | 56 | -32.9% | -32.9% | -33.8% | 8.8% | lower time in every pair, beyond control spread |
| Firestore / equal document | 657 | 696 | 6.1% | 6.1% | 2.6% | 0.8% | unestablished at this precision |
| Firestore / changed document | 606 | 667 | 10.2% | 8.8% | 12.5% | 1.9% | higher time in every pair, beyond control spread |
| Firestore / equal query | 678 | 766 | 13.1% | 13.4% | 11.6% | 1.6% | higher time in every pair, beyond control spread |
| Firestore / changed filter | 134 | 149 | 13.1% | 13.6% | 10.1% | 9.4% | unestablished at this precision |
| Firestore / arrayUnion | 80 | 83 | 5.1% | 12.3% | -4.3% | 9.3% | unestablished at this precision |
| Firestore / arrayRemove | 80 | 88 | 10.4% | 10.8% | 9.6% | 2.6% | higher time in every pair, beyond control spread |
| Firestore / aggregate query | 896 | 990 | 10.5% | 11.5% | 0.9% | 1.3% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by `bench/compare.cjs`:

```sh
OUTPUT=packages/vfast-deep-equal/bench/results/node-isolated.json node packages/vfast-deep-equal/bench/compare.cjs
OUTPUT=packages/vfast-deep-equal/bench/results/bun-isolated.json bun packages/vfast-deep-equal/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vfast-deep-equal
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
