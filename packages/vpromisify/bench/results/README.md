# vpromisify benchmark evidence

Published **@google-cloud/promisify 6.2.1** versus vpromisify, Node **24.22.1**
and Bun **1.4.0**, macOS arm64. Reports retain timestamps, CPU/runtime details,
source and fixture hashes, and every sample.

Three fresh comparison processes and one identical-upstream control per runtime.
Each case receives 150 ms warmup per variant and four full warmup blocks, then
12 alternating paired rounds. A pilot targets 15 ms blocks, capped at 100,000
operations. Outputs are retained and validated outside timing. No trimming.

Times are pooled sample medians; changes are medians of paired ratios and need
not equal the ratio of the time columns. Each process change is its paired
median. Negative means less time; controls use upstream in both slots.

## Node

| Case | Upstream ns | VPM ns | Paired change | Process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| wrapper creation | 22 | 29 | +31.6% | +30.0%, +28.3%, +34.0% | -1.4% |
| callback pass-through | 18 | 18 | +0.1% | -1.6%, +0.4%, +0.1% | +2.6% |
| single-result promise | 195 | 158 | -18.6% | -19.8%, -18.3%, -18.3% | +1.3% |
| multi-result promise | 202 | 165 | -18.6% | -18.8%, -19.0%, -17.4% | +0.2% |
| singular promise | 169 | 134 | -21.6% | -21.4%, -21.7%, -20.9% | +0.1% |
| promise to callback | 383 | 181 | -52.7% | -53.0%, -52.7%, -52.7% | -0.8% |
| wrap 20 class methods | 18,808 | 20,216 | +6.5% | -2.1%, +15.5%, +9.9% | +2.6% |

## Bun

| Case | Upstream ns | VPM ns | Paired change | Process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| wrapper creation | 26 | 11 | -59.1% | -59.9%, -57.6%, -61.2% | -7.5% |
| callback pass-through | 32 | 23 | -28.0% | -27.7%, -28.8%, -26.7% | -1.0% |
| single-result promise | 148 | 148 | -0.9% | -0.6%, -1.6%, +2.9% | -1.1% |
| multi-result promise | 169 | 155 | -8.3% | -11.9%, -6.7%, -8.6% | +1.1% |
| singular promise | 162 | 151 | -7.5% | -7.8%, -3.1%, -7.6% | +1.6% |
| promise to callback | 233 | 239 | +3.7% | +0.8%, -0.0%, +13.0% | +0.7% |
| wrap 20 class methods | 3,388 | 5,089 | +51.9% | +55.9%, +49.7%, +51.9% | +0.1% |

## Interpretation and limits

Node promise conversion takes about **19–22% less time** and promise-to-callback
conversion about **53% less**. Callback pass-through is effectively unchanged.
Bun multi-result/singular conversion takes about **8% less**; the single-result
case is within control noise. Bun callback pass-through takes 28% less time.

Remaining costs are concentrated in setup: Node wrapper creation takes **32%
more**, approximately **7 ns**; wrapping 20 methods takes a pooled **7% more**,
with substantial process variation. Bun class wrapping takes **52% more**,
about **1.7 microseconds per 20 methods**, for descriptor inspection and
preflight before mutation. Bun callback conversion has a pooled +4% result but
processes range from approximately unchanged to +13%, so its precise change is
uncertain. Bun wrapper creation improves in this harness, with a -8% control
that limits the precision of its -59% estimate.

These are in-process operations, not Storage network performance. Setup and
per-call timings are separate; a class normally gets wrapped once at module
initialization. The harness does not isolate the cost of individual checks.

Reproduce from the repository root:

```sh
OUTPUT=packages/vpromisify/bench/results/node-1.json node packages/vpromisify/bench/compare.cjs
# Repeat with samples 2 and 3; use CALIBRATION=1 for node-control.json.
# Repeat with bun and bun-* output filenames.
node packages/vpromisify/bench/summarize.cjs --verify-current
```
