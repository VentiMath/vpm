# vyocto-queue paired benchmarks

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
| queue creation | 17 | 17 | +0.4% | +0.3%, +0.5%, -0.1% | -2.3% |
| reused enqueue/dequeue | 20 | 21 | +1.9% | +0.2%, +0.6%, +8.9% | -0.6% |
| 64-item FIFO burst | 1,100 | 1,071 | -2.6% | -2.4%, -2.0%, -4.6% | +0.4% |
| rotate and iterate 64 | 1,445 | 1,435 | +0.4% | +2.3%, -0.7%, +0.9% | -2.0% |
| drain 64 items | 2,214 | 2,144 | -3.1% | -3.0%, -2.4%, -3.8% | +0.3% |
| clear 64 and reuse | 584 | 571 | -2.8% | -2.7%, -3.0%, -2.8% | +0.4% |

## Bun

| Operation | Upstream ns | VPM ns | Change | Three process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| queue creation | 9 | 9 | +6.3% | +7.6%, +8.9%, -7.3% | -23.8% |
| reused enqueue/dequeue | 11 | 11 | +0.1% | -0.1%, -0.3%, +0.8% | +19.4% |
| 64-item FIFO burst | 859 | 834 | +1.4% | -3.5%, +1.8%, +2.6% | -0.6% |
| rotate and iterate 64 | 1,718 | 1,623 | -8.7% | -17.1%, -4.4%, -7.2% | -3.1% |
| drain 64 items | 3,539 | 2,832 | -19.4% | -21.7%, -18.2%, -20.0% | -1.8% |
| clear 64 and reuse | 832 | 810 | -3.0% | -0.8%, +0.1%, -3.5% | +1.2% |

Most queue operations remain close to upstream. Node burst, drain and clear
cases use about 3% less time. Bun draining uses about 19% less time, consistent
across processes; iteration varies more. Tiny creation/roundtrip timings are
too sensitive to JIT specialization and noise for a speed claim: Bun controls
vary by roughly 19–24%, and Node roundtrip ranges from +0.2% to +8.9%.
The observed +6.3% Bun creation and +1.4% burst medians are retained rather
than presented as improvements. This queue is a small compatible foundation,
not evidence of a large application performance gain.

## Reproduce

From the repository root, after installing the conformance fixture:

```sh
OUTPUT=packages/vyocto-queue/bench/results/node-1.json node packages/vyocto-queue/bench/compare.cjs
# Repeat samples 2/3 and all three with bun.
CALIBRATION=1 OUTPUT=packages/vyocto-queue/bench/results/node-control.json node packages/vyocto-queue/bench/compare.cjs
# Repeat the control with bun.
node packages/vyocto-queue/bench/summarize.cjs --verify-current
```

The eight raw JSON reports in this directory retain the complete evidence.
Benchmarks and fixtures are excluded from installable package archives.
