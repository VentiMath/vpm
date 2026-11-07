# vrope-sequence measurements

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

Recorded 2026-11-07T08:01:19.895Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| snapshot 32 array entries | 7 | 34 | 427.6% | 430.8% | 421% | 3.5% | higher time in every pair, beyond control spread |
| append 16 entries to 4096-item sequence | 110 | 170 | 55.1% | 59.5% | 50.3% | 2.9% | higher time in every pair, beyond control spread |
| concatenate two 8192-item sequences | 11 | 19 | 79.1% | 93.9% | 65.3% | 8.8% | higher time in every pair, beyond control spread |
| slice middle 4096 of 16384 entries | 359 | 248 | -30.6% | -30% | -31.4% | 3.3% | lower time in every pair, beyond control spread |
| random lookup in 16384 entries | 20 | 34 | 67.3% | 67.4% | 67.3% | 3.7% | higher time in every pair, beyond control spread |
| reverse scan 4096 entries | 10094 | 11468 | 13.7% | 14.2% | 12.8% | 1.7% | higher time in every pair, beyond control spread |
| flatten 16384 entries to array | 106820 | 42003 | -60.6% | -49% | -60.6% | 1.4% | lower time in every pair, beyond control spread |
| ProseMirror history 32 edits and undo | 132203 | 141029 | 11.6% | 11.6% | 5.6% | 19.4% | unestablished at this precision |

## Bun 1.4.4

Recorded 2026-11-07T08:01:52.982Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| snapshot 32 array entries | 4 | 41 | 973.7% | 975.9% | 973.7% | 0.9% | higher time in every pair, beyond control spread |
| append 16 entries to 4096-item sequence | 100 | 155 | 55.9% | 55.9% | 55.9% | 1.4% | higher time in every pair, beyond control spread |
| concatenate two 8192-item sequences | 21 | 22 | 8.1% | 8.6% | 6% | 1.3% | unestablished at this precision |
| slice middle 4096 of 16384 entries | 530 | 357 | -33.6% | -32.2% | -36.5% | 10.1% | lower time in every pair, beyond control spread |
| random lookup in 16384 entries | 47 | 21 | -56.3% | -52.5% | -70.1% | 17% | lower time in every pair, beyond control spread |
| reverse scan 4096 entries | 3664 | 3884 | 6.1% | 6.7% | 3.6% | 0.4% | unestablished at this precision |
| flatten 16384 entries to array | 78770 | 18709 | -76.2% | -76.5% | -75.8% | 3.9% | lower time in every pair, beyond control spread |
| ProseMirror history 32 edits and undo | 80654 | 79002 | -1.4% | 18.6% | -12.8% | 2.4% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/compare.cjs:

```sh
OUTPUT=packages/vrope-sequence/bench/results/node-isolated.json node packages/vrope-sequence/bench/compare.cjs
OUTPUT=packages/vrope-sequence/bench/results/bun-isolated.json bun packages/vrope-sequence/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vrope-sequence results compare.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
