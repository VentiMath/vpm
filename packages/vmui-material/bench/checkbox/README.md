# vmui-material measurements

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

Recorded 2026-11-15T06:36:58.805Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 small Checkbox SSR | 778667 | 686962 | -10.6% | -12.6% | -10.6% | 8.7% | lower time in every pair, beyond control spread |
| Material9 table Checkbox SSR | 722739 | 669259 | -7.6% | -7.6% | -8.3% | 7.6% | unestablished at this precision |
| Material9 label Checkbox SSR | 944149 | 819917 | -12.5% | -15.1% | -11.3% | 11.2% | unestablished at this precision |
| Material9 form Checkbox SSR | 1072019 | 1072599 | 0.1% | -2.1% | 2.5% | 3.9% | unestablished at this precision |
| App7 small Checkbox SSR | 700031 | 649316 | -6.3% | -5.5% | -8.1% | 3.7% | lower time in every pair, beyond control spread |
| App7 table Checkbox SSR | 676065 | 636098 | -4.6% | -4.5% | -6.2% | 3.8% | lower time in every pair, beyond control spread |
| App7 label Checkbox SSR | 1004379 | 835217 | -16.6% | -19.8% | -14.5% | 1.5% | lower time in every pair, beyond control spread |
| App7 form Checkbox SSR | 1234598 | 1107699 | -8.8% | -13.7% | -8.8% | 3.1% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-15T06:37:35.659Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Material9 small Checkbox SSR | 528676 | 383586 | -29.7% | -27.4% | -35.7% | 11.7% | lower time in every pair, beyond control spread |
| Material9 table Checkbox SSR | 509607 | 359640 | -28.8% | -28.6% | -30.6% | 0.2% | lower time in every pair, beyond control spread |
| Material9 label Checkbox SSR | 671469 | 532656 | -22.3% | -19.5% | -24.3% | 4.6% | lower time in every pair, beyond control spread |
| Material9 form Checkbox SSR | 881558 | 712346 | -19.1% | -16.9% | -19.1% | 7.1% | lower time in every pair, beyond control spread |
| App7 small Checkbox SSR | 480551 | 378794 | -21.8% | -22.9% | -21.8% | 7.6% | lower time in every pair, beyond control spread |
| App7 table Checkbox SSR | 483488 | 364319 | -24.5% | -24.4% | -24.6% | 2.2% | lower time in every pair, beyond control spread |
| App7 label Checkbox SSR | 684682 | 525492 | -23.9% | -23.9% | -22.7% | 2.7% | lower time in every pair, beyond control spread |
| App7 form Checkbox SSR | 847419 | 693130 | -15.8% | -15.8% | -16.8% | 5.6% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/checkbox.cjs:

```sh
OUTPUT=packages/vmui-material/bench/checkbox/node-isolated.json node packages/vmui-material/bench/checkbox.cjs
OUTPUT=packages/vmui-material/bench/checkbox/bun-isolated.json bun packages/vmui-material/bench/checkbox.cjs
node scripts/render-bench-report.cjs packages/vmui-material checkbox checkbox.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
