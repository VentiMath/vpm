# vstrnum paired benchmarks

Baseline: **strnum 2.5.1**. Recorded October 30, 2026 on Apple M1 Pro,
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
| short integers | 334 | 159 | -52.2% | -52.1%, -52.2%, -52.5% | +0.4% |
| XML default options | 354 | 157 | -55.7% | -56.0%, -55.2%, -55.9% | -0.2% |
| non-numeric XML values | 207 | 77 | -62.8% | -61.9%, -62.8%, -63.3% | +1.8% |
| decimal with trailing zeros | 492 | 325 | -33.9% | -34.2%, -32.4%, -33.8% | -0.9% |
| scientific notation | 318 | 192 | -40.1% | -38.9%, -40.9%, -40.2% | -0.0% |
| hex binary octal | 229 | 108 | -52.8% | -52.7%, -53.0%, -52.9% | -0.4% |
| precision-preserving rejection | 400 | 276 | -31.5% | -34.8%, -30.9%, -31.6% | +0.2% |
| Unicode normalization | 631 | 416 | -34.4% | -34.3%, -34.7%, -34.1% | -0.5% |
| skip pattern | 157 | 54 | -65.5% | -65.3%, -66.3%, -65.5% | +0.4% |
| overflow handling | 242 | 178 | -27.2% | -27.3%, -26.3%, -28.4% | -0.0% |
| long decimal 4KiB | 10,320 | 5,900 | -42.9% | -42.7%, -42.8%, -43.6% | -0.1% |

## Bun

| Case | Upstream ns | VPM ns | Paired change | Three process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| short integers | 244 | 96 | -60.5% | -61.2%, -60.8%, -59.8% | +0.2% |
| XML default options | 277 | 93 | -66.1% | -67.6%, -65.8%, -65.5% | -0.0% |
| non-numeric XML values | 150 | 42 | -72.2% | -71.4%, -72.5%, -72.6% | +1.0% |
| decimal with trailing zeros | 455 | 202 | -56.6% | -53.8%, -57.6%, -58.0% | -0.8% |
| scientific notation | 235 | 117 | -50.6% | -49.2%, -50.4%, -52.2% | +1.4% |
| hex binary octal | 218 | 60 | -72.6% | -72.6%, -72.2%, -72.9% | -0.0% |
| precision-preserving rejection | 326 | 188 | -42.3% | -42.7%, -41.3%, -43.0% | +0.3% |
| Unicode normalization | 487 | 292 | -41.1% | -37.2%, -41.1%, -41.3% | +0.8% |
| skip pattern | 147 | 36 | -75.6% | -75.8%, -75.4%, -75.6% | -0.5% |
| overflow handling | 183 | 108 | -40.7% | -40.0%, -43.3%, -40.7% | +0.1% |
| long decimal 4KiB | 9,272 | 5,387 | -41.9% | -41.9%, -42.3%, -41.3% | -0.3% |

## Interpretation

Every measured case improves in all three processes on both runtimes. Parsing
with the XML defaults takes about **56% less time on Node and 66% less on Bun**;
non-numeric XML values take 63% / 72% less. The long-decimal and overflow cases
also improve after retaining the grammar and option checks. These are isolated
parsing costs, not XML-document, network or application throughput measurements.

## Reproduce

```sh
npm --prefix scripts/numbers-conformance ci --ignore-scripts
OUTPUT=packages/vstrnum/bench/results/node-1.json node packages/vstrnum/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vstrnum/bench/results/node-control.json node packages/vstrnum/bench/compare.cjs
node packages/vstrnum/bench/summarize.cjs --verify-current
```

Repeat with fresh processes `2` and `3`, then with `bun` and corresponding output
names. The eight JSON reports retain runtime/CPU metadata, all samples, checksums,
and SHA-256 hashes for implementation, benchmark, shared harness and pinned source
manifest. `--verify-current` checks those hashes against the checkout.
