# vp-limit paired benchmarks

Recorded October 30, 2026 on Apple M1 Pro (darwin/arm64); Node 24.22.1 and Bun 1.4.0.

Each runtime uses three fresh processes, with 150ms per-variant warmup, four
warmup blocks and 12 alternating paired rounds per case. A 15ms upstream pilot
selects block size, capped at 100,000 operations. Outputs are retained and checked
outside timing. Inputs rotate through 256 distinct objects to avoid a fixed-value
benchmark. Reports retain every sample, runtime metadata and source hashes.

Time columns are pooled medians in nanoseconds per operation. Change is the
median paired VPM/upstream ratio; negative means less time. It need not equal
the ratio of the rounded time columns. Process values are the three individual
paired medians. Control runs compare upstream against itself and expose noise.
No samples are trimmed.

## Node

| Operation | Upstream ns | VPM ns | Change | Three process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| limiter creation | 1,344 | 1,345 | -2.3% | -1.0%, +2.7%, -6.6% | +5.5% |
| serial sync task | 419 | 249 | -41.0% | -40.0%, -41.1%, -42.2% | -1.5% |
| serial async task | 526 | 348 | -34.0% | -34.2%, -32.9%, -34.9% | +0.1% |
| 32 tasks at concurrency 4 | 18,342 | 14,126 | -23.3% | -22.7%, -23.2%, -26.4% | -0.1% |
| map 32 at concurrency 4 | 15,702 | 11,544 | -26.5% | -25.8%, -26.1%, -27.9% | +0.2% |
| limited function wrapper | 535 | 361 | -32.7% | -33.4%, -31.9%, -32.4% | -0.3% |
| rejection and recovery | 1,604 | 1,225 | -23.8% | -24.2%, -22.3%, -27.5% | -0.5% |

## Bun

| Operation | Upstream ns | VPM ns | Change | Three process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| limiter creation | 417 | 404 | -3.0% | -1.2%, -4.4%, -3.1% | -1.7% |
| serial sync task | 408 | 248 | -41.7% | -36.4%, -34.2%, -49.8% | +1.6% |
| serial async task | 507 | 392 | -22.0% | -22.8%, -21.3%, -23.7% | +1.3% |
| 32 tasks at concurrency 4 | 18,383 | 14,929 | -18.1% | -15.9%, -18.7%, -20.4% | -0.2% |
| map 32 at concurrency 4 | 15,274 | 12,735 | -17.1% | -14.8%, -17.5%, -17.8% | -2.3% |
| limited function wrapper | 581 | 423 | -26.5% | -25.1%, -25.1%, -27.4% | -0.2% |
| rejection and recovery | 1,304 | 1,037 | -19.3% | -19.8%, -16.5%, -20.2% | -0.0% |

Node task cases use about 23–41% less time; Bun task cases use about 17–42%
less. These gains persist across all three processes and exceed the controls.
Limiter construction is approximately unchanged on Node and modestly lower
on Bun. These tests isolate scheduling and promise overhead; they do not measure
cloud I/O, end-to-end Storage throughput, or performance with async instrumentation
enabled. Correctness under AsyncLocalStorage is tested separately.

## Reproduce

From the repository root, after installing the conformance fixture:

```sh
OUTPUT=packages/vp-limit/bench/results/node-1.json node packages/vp-limit/bench/compare.cjs
# Repeat samples 2/3 and all three with bun.
CALIBRATION=1 OUTPUT=packages/vp-limit/bench/results/node-control.json node packages/vp-limit/bench/compare.cjs
# Repeat the control with bun.
node packages/vp-limit/bench/summarize.cjs --verify-current
```

The eight raw JSON reports in this directory retain the complete evidence.
Benchmarks and fixtures are excluded from installable package archives.
