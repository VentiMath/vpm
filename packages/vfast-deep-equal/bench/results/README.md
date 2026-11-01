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

Recorded 2026-11-01T09:50:45.090Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| primitive / equal | 1 | 1 | 5.8% | 1.4% | 5.8% | 7.9% | unestablished at this precision |
| record / small equal | 96 | 83 | -13.6% | -13.6% | -12.3% | 4.8% | lower time in every pair, beyond control spread |
| record / changed value | 61 | 46 | -23.8% | -25.4% | 66.2% | 1.1% | unestablished at this precision |
| record / missing key | 29 | 30 | 5.3% | 5.3% | 10.2% | 1.3% | unestablished at this precision |
| record / nested 64 fields | 13461 | 12579 | -6.6% | -6.6% | 30.6% | 3.9% | unestablished at this precision |
| array / 32 records | 2473 | 2326 | -6.4% | -6.4% | -5% | 4.7% | unestablished at this precision |
| Buffer / equal 1KiB | 280 | 92 | -67% | -67.6% | -66.9% | 6.5% | lower time in every pair, beyond control spread |
| Map / nested 32 entries | 4013 | 4741 | 18.4% | 19.7% | 18.4% | 3.6% | higher time in every pair, beyond control spread |
| Set / 32 primitives | 398 | 304 | -23.7% | -23.3% | -26.4% | 5.8% | lower time in every pair, beyond control spread |
| React / equal element | 169 | 163 | -3.4% | -1.9% | -7.8% | 3.9% | unestablished at this precision |
| Firestore / equal document | 1080 | 1003 | -6.8% | -5.2% | -8.3% | 4.9% | unestablished at this precision |
| Firestore / changed document | 952 | 889 | -6.1% | -5.4% | -7.5% | 4% | lower time in every pair, beyond control spread |
| Firestore / equal query | 1180 | 1060 | -10% | -10.2% | -1.9% | 6.1% | unestablished at this precision |
| Firestore / changed filter | 178 | 174 | -2.5% | -2.1% | -2.6% | 52.9% | unestablished at this precision |
| Firestore / arrayUnion | 107 | 99 | -7.1% | -4% | -9.1% | 2.4% | lower time in every pair, beyond control spread |
| Firestore / arrayRemove | 100 | 99 | -0.8% | -2% | -0.2% | 5.3% | unestablished at this precision |
| Firestore / aggregate query | 1514 | 1432 | -4% | -4% | -5.1% | 4.1% | unestablished at this precision |

## Bun 1.4.0

Recorded 2026-11-01T09:51:58.195Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| primitive / equal | 1 | 1 | 2.4% | 149.2% | 2.4% | 5.4% | unestablished at this precision |
| record / small equal | 40 | 41 | 1% | 86.4% | -0.5% | 1.3% | unestablished at this precision |
| record / changed value | 34 | 31 | -7.6% | 6.4% | -21.3% | 12.8% | unestablished at this precision |
| record / missing key | 25 | 30 | 18.3% | 33.3% | -8.6% | 40.4% | unestablished at this precision |
| record / nested 64 fields | 4071 | 4136 | 1.4% | 1.7% | -1.1% | 1.5% | unestablished at this precision |
| array / 32 records | 1075 | 1065 | -1.3% | -0.2% | -4% | 2.6% | unestablished at this precision |
| Buffer / equal 1KiB | 442 | 48 | -88.8% | -91.5% | -88.8% | 13.4% | lower time in every pair, beyond control spread |
| Map / nested 32 entries | 3011 | 2336 | -21.6% | -21.6% | -25.7% | 5.8% | unestablished at this precision |
| Set / 32 primitives | 280 | 219 | -22.1% | -30.6% | -17.4% | 11.7% | unestablished at this precision |
| React / equal element | 71 | 50 | -28.9% | -26.4% | -32.7% | 4.8% | lower time in every pair, beyond control spread |
| Firestore / equal document | 664 | 624 | -5.5% | -3.2% | -6.3% | 3.6% | unestablished at this precision |
| Firestore / changed document | 618 | 605 | 0.2% | 7.6% | 0.2% | 21.7% | unestablished at this precision |
| Firestore / equal query | 785 | 714 | -10.5% | -21% | -8.3% | 2.7% | lower time in every pair, beyond control spread |
| Firestore / changed filter | 134 | 144 | 6.7% | -0.9% | 15% | 12.8% | unestablished at this precision |
| Firestore / arrayUnion | 78 | 74 | -4% | -17.1% | -3.6% | 22.3% | unestablished at this precision |
| Firestore / arrayRemove | 78 | 77 | 18.3% | -28.1% | 28.9% | 26.9% | unestablished at this precision |
| Firestore / aggregate query | 908 | 1404 | 75.6% | 45.3% | 75.6% | 7.7% | unestablished at this precision |

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
