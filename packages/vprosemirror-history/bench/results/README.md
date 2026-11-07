# vprosemirror-history measurements

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

Recorded 2026-11-07T08:40:10.940Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| record 16 grouped typing edits | 46353 | 37394 | -16.9% | -16.9% | -16.9% | 9.9% | unestablished at this precision |
| record 32 separate history events | 86206 | 80001 | -6.6% | -14.5% | 27.8% | 5% | unestablished at this precision |
| undo 32 separate events | 82796 | 62101 | -25% | -24% | -28.2% | 1% | lower time in every pair, beyond control spread |
| redo 32 separate events | 64682 | 50830 | -19.1% | -15.4% | -21.9% | 11.6% | lower time in every pair, beyond control spread |
| undo through 256 untracked position maps | 40906 | 20643 | -49.3% | -50.5% | -48.6% | 1.3% | lower time in every pair, beyond control spread |
| invalidate redo with a new edit | 2860 | 2204 | -25.1% | -28% | -22.6% | 5.4% | lower time in every pair, beyond control spread |
| record 64 events with depth 16 | 188239 | 155823 | -19.3% | -23% | -19.3% | 9.6% | lower time in every pair, beyond control spread |
| 160 partial undo and redo cycles | 660486 | 574657 | -15.8% | -24.8% | -6.4% | 5.2% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-07T08:40:55.407Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| record 16 grouped typing edits | 22776 | 32174 | 40.7% | 49.2% | 40.7% | 1.7% | higher time in every pair, beyond control spread |
| record 32 separate history events | 51573 | 70936 | 41.2% | 48.4% | 33% | 1.8% | higher time in every pair, beyond control spread |
| undo 32 separate events | 56305 | 59933 | 7.2% | 7.2% | 7.2% | 3.1% | unestablished at this precision |
| redo 32 separate events | 45518 | 49089 | 7.4% | 2.8% | 9.2% | 4.1% | unestablished at this precision |
| undo through 256 untracked position maps | 27979 | 34073 | 21.1% | 21.1% | 19.2% | 2.9% | unestablished at this precision |
| invalidate redo with a new edit | 1207 | 1576 | 29.7% | 29.7% | 30.1% | 5.4% | higher time in every pair, beyond control spread |
| record 64 events with depth 16 | 84031 | 109889 | 31.1% | 32.9% | 29.2% | 7% | higher time in every pair, beyond control spread |
| 160 partial undo and redo cycles | 389025 | 552660 | 37% | 37% | 54.1% | 12.4% | higher time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vprosemirror-history/bench/results/node-isolated.json node packages/vprosemirror-history/bench/compare.cjs
OUTPUT=packages/vprosemirror-history/bench/results/bun-isolated.json bun packages/vprosemirror-history/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vprosemirror-history results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
