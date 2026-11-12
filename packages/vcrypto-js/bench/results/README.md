# vcrypto-js measurements

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

Recorded 2026-11-12T23:13:22.405Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](node-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| short SHA256 digest | 2648 | 1269 | -51.7% | -51.7% | -52.7% | 2.9% | lower time in every pair, beyond control spread |
| contest paper version SHA256 | 67344 | 2540 | -96.2% | -96.4% | -96.1% | 1% | lower time in every pair, beyond control spread |
| mock HMAC token signing | 12755 | 2927 | -77% | -76.9% | -77% | 81.5% | unestablished at this precision |
| UTF8 and Base64 encoding | 92033 | 75104 | -18% | -18% | -18.4% | 2% | lower time in every pair, beyond control spread |

## Bun 1.4.4

Recorded 2026-11-12T23:13:45.404Z on Apple M1 Pro, darwin/arm64.

[Raw samples, processes, controls and source hashes](bun-isolated.json).

| Case | Upstream ns | VPM ns | Change | Upstream first | VPM first | Largest control | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| short SHA256 digest | 1435 | 1047 | -27.6% | -27.6% | -26.1% | 4.2% | lower time in every pair, beyond control spread |
| contest paper version SHA256 | 47649 | 2299 | -95.1% | -95.5% | -94.9% | 1.6% | lower time in every pair, beyond control spread |
| mock HMAC token signing | 5714 | 1306 | -77.4% | -76.5% | -78.3% | 5.7% | lower time in every pair, beyond control spread |
| UTF8 and Base64 encoding | 56961 | 48021 | -15.9% | -14% | -15.9% | 4.3% | lower time in every pair, beyond control spread |

## Reproduce

Run these commands from the repository root after installing the pinned
fixtures used by bench/run.cjs:

```sh
OUTPUT=packages/vcrypto-js/bench/results/node-isolated.json node packages/vcrypto-js/bench/run.cjs
OUTPUT=packages/vcrypto-js/bench/results/bun-isolated.json bun packages/vcrypto-js/bench/run.cjs
node scripts/render-bench-report.cjs packages/vcrypto-js results run.cjs
```

The renderer verifies the source hashes and recording structure before writing
this page. File hashes are SHA-256; directory hashes cover a sorted recursive
name/hash manifest. Historical reports remain in repository history.
