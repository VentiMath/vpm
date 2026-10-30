# vanynum paired benchmarks

Baseline: **anynum 1.0.1**. Recorded October 30, 2026 on Apple M1 Pro,
darwin arm64, with Node.js 24.22.1 and Bun 1.4.0. Times are nanoseconds per
operation; lower is better.

Three fresh processes and one identical-upstream control per runtime. Each case
gets 150ms of warmup per variant and four full warmup blocks, then 12 alternating
paired rounds. A 15ms upstream pilot selects the iteration count, capped at
100,000. Inputs vary across 32 strings for normalization and 64 for parsing
(four for radix parsing). Outputs are retained and checked outside timing.
No samples are discarded. Benchmarks ran serially without concurrent test runs.

Displayed times are medians of 36 samples. Changes are medians of paired ratios,
not ratios of the displayed medians; each process's change is also shown. Controls
measure identical upstream code in both slots, without subtraction. Small changes
near the control and process variation do not establish a meaningful gain.

## Node

| Case | Upstream ns | VPM ns | Paired change | Three process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| short ASCII number | 32 | 27 | -16.7% | -16.9%, -17.0%, -15.3% | +0.7% |
| plain ASCII 4KiB | 21,406 | 28 | -99.9% | -99.9%, -99.9%, -99.9% | +0.1% |
| short Devanagari | 256 | 232 | -9.5% | -9.8%, -9.9%, -8.5% | -3.4% |
| short fullwidth | 252 | 230 | -8.7% | -8.8%, -8.6%, -8.7% | +2.6% |
| mathematical digits | 261 | 258 | -0.2% | +1.4%, -1.3%, -3.3% | -0.2% |
| dense mixed digits 4KiB | 77,943 | 68,717 | -11.7% | -12.2%, -11.6%, -8.6% | +0.2% |
| sparse digits in text | 13,727 | 1,339 | -90.2% | -90.2%, -90.2%, -90.4% | -1.1% |
| unchanged Unicode | 4,007 | 2,208 | -44.8% | -44.9%, -44.9%, -4.5% | -0.4% |

## Bun

| Case | Upstream ns | VPM ns | Paired change | Three process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| short ASCII number | 32 | 25 | -19.4% | -18.7%, -20.0%, -19.7% | +1.4% |
| plain ASCII 4KiB | 12,976 | 3,298 | -74.7% | -74.6%, -74.9%, -74.6% | -0.4% |
| short Devanagari | 132 | 123 | -7.1% | -5.0%, -7.1%, -9.0% | +1.6% |
| short fullwidth | 133 | 125 | -5.3% | -5.3%, -5.6%, -5.2% | +2.2% |
| mathematical digits | 144 | 139 | -3.6% | -4.4%, -3.9%, -1.6% | -0.5% |
| dense mixed digits 4KiB | 37,236 | 41,061 | +10.3% | +12.2%, +10.3%, +10.0% | -2.3% |
| sparse digits in text | 4,650 | 956 | -79.5% | -79.5%, -79.2%, -79.6% | -0.6% |
| unchanged Unicode | 2,011 | 1,299 | -34.9% | -32.6%, -35.2%, -35.6% | +0.1% |

## Interpretation

ASCII numbers take about 17% / 19% less time on Node / Bun. Sparse conversion is
about 90% / 80% faster. Mathematical-digit conversion on Node is effectively tied.
Unchanged Unicode improves in all three processes, but one Node process shows
only a 4.5% gain, so the pooled 45% figure is not uniformly repeatable.

Dense mixed Unicode conversion is a **10.3% Bun regression** (12.2%, 10.3%, 10.0%
in individual processes), while Node improves about 12%. It remains documented:
the smaller two-level table and output assembly have a cost on this workload.
The default Storage XML caller disables Unicode conversion. These local helper
costs do not establish cloud-upload or application throughput improvements.

## Reproduce

```sh
npm --prefix scripts/numbers-conformance ci --ignore-scripts
OUTPUT=packages/vanynum/bench/results/node-1.json node packages/vanynum/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vanynum/bench/results/node-control.json node packages/vanynum/bench/compare.cjs
node packages/vanynum/bench/summarize.cjs --verify-current
```

Repeat with fresh processes `2` and `3`, then with `bun` and corresponding output
names. The eight JSON reports retain runtime/CPU metadata, all samples, checksums,
and SHA-256 hashes for implementation, benchmark, shared harness and pinned source
manifest. `--verify-current` checks those hashes against the checkout.
