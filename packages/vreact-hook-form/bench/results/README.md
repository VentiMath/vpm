# vreact-hook-form measurements

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

Recorded 2026-11-12T19:15:51.480Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR form with 0 controlled inputs | 11381 | 9656 | -17.4% | -22.7% | -15% | 3.1% | lower time in every pair, beyond control spread |
| SSR form with 20 controlled inputs | 149662 | 49090 | -64.2% | -63.6% | -67.5% | 11.4% | lower time in every pair, beyond control spread |
| create, register, update and read twenty fields | 16308 | 9895 | -36% | -36% | -33.9% | 7.3% | lower time in every pair, beyond control spread |
| validate and submit twenty fields through Zod | 10206 | 9598 | -5.1% | -4.3% | -7.1% | 1.9% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-12T19:16:08.356Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| SSR form with 0 controlled inputs | 6250 | 3924 | -35.9% | -39.2% | -32.8% | 7.8% | lower time in every pair, beyond control spread |
| SSR form with 20 controlled inputs | 105127 | 56458 | -44% | -45.5% | -44% | 4.1% | lower time in every pair, beyond control spread |
| create, register, update and read twenty fields | 13651 | 7702 | -41% | -45.2% | -35.7% | 12.9% | lower time in every pair, beyond control spread |
| validate and submit twenty fields through Zod | 9022 | 8593 | -4.8% | -4.8% | -5.7% | 62.6% | unestablished at this precision |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/run.cjs:

```sh
OUTPUT=packages/vreact-hook-form/bench/results/node-isolated.json node packages/vreact-hook-form/bench/run.cjs
OUTPUT=packages/vreact-hook-form/bench/results/bun-isolated.json bun packages/vreact-hook-form/bench/run.cjs
node scripts/render-bench-report.cjs packages/vreact-hook-form results run.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.

## Workload limits

The rendering cases are production React SSR, not browser paint. The state case
creates/registers twenty fields before one dirty update and read; the Zod case
reuses a twenty-field form and awaits a valid submission. Current 7.92.0 is the
timed control; the app's 7.56.0 is a semantic comparison, not this timing baseline.
The Bun Zod direction is unestablished because of control spread.

[Mounted updates](../updates/README.md) measure actual React DOM commits separately.
Their medians remain slightly higher, with mixed paired directions on both
runtimes; no update-speed win or resolved small regression is claimed.
