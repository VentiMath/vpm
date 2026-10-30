# vduplexify benchmark evidence

Published duplexify **4.1.3** versus vduplexify, on Node **24.22.1** and Bun
**1.4.0**, macOS arm64. Raw reports retain timestamps, runtime/CPU details,
source and fixture hashes, and every measurement.

Three fresh comparison processes and one identical-upstream control run per
runtime. Each case receives 150 ms warmup per variant, four full warmup blocks,
then 12 alternating paired rounds. The upstream pilot targets 15 ms per block,
capped at 100,000 operations. Outputs are retained and validated outside timing.
No samples or processes are trimmed. Negative changes mean less time.

Times are medians of all raw samples; changes are medians of paired ratios,
which need not equal the ratio of the two time columns. Each process change
uses that process's paired median. Controls put upstream in both slots.

## Node

| Case | Upstream ns | VPM ns | Paired change | Process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| unattached construction | 177 | 93 | -46.0% | -46.4%, -43.5%, -49.7% | -1.5% |
| object construction | 180 | 104 | -42.6% | -43.3%, -40.6%, -42.5% | -0.6% |
| binary transfer | 11,706 | 7,556 | -37.1% | -32.4%, -38.1%, -39.4% | -0.5% |
| objects transfer | 11,872 | 9,099 | -22.5% | -22.1%, -23.0%, -23.7% | -0.2% |
| delayed transfer | 12,078 | 8,579 | -28.6% | -27.4%, -28.1%, -30.9% | +0.5% |
| backpressure transfer | 11,100 | 14,439 | +31.3% | +30.5%, +31.3%, +33.2% | +1.0% |
| replace sink and finish | 2,740 | 3,017 | +10.0% | +8.6%, +9.8%, +11.9% | +1.7% |
| google-gax bidirectional stream | 19,244 | 19,264 | -0.1% | +7.3%, -7.8%, -1.4% | +7.6% |

## Bun

| Case | Upstream ns | VPM ns | Paired change | Process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| unattached construction | 181 | 119 | -39.3% | -46.5%, -35.2%, -33.9% | +0.4% |
| object construction | 192 | 142 | -26.2% | -25.2%, -27.6%, -23.9% | +2.6% |
| binary transfer | 13,485 | 12,841 | -3.8% | -2.2%, -1.3%, -7.1% | +2.6% |
| objects transfer | 14,192 | 14,113 | -1.0% | +0.1%, +0.0%, -3.4% | -0.5% |
| delayed transfer | 13,600 | 13,926 | +1.4% | +4.3%, +0.5%, +2.5% | -0.3% |
| backpressure transfer | 14,610 | 16,074 | +9.7% | +10.4%, +14.8%, +9.0% | -0.7% |
| replace sink and finish | 3,206 | 3,238 | -0.8% | -3.3%, +11.7%, +1.7% | -0.6% |
| google-gax bidirectional stream | 18,234 | 20,550 | +13.0% | +13.6%, +8.7%, +12.5% | +6.1% |

## Interpretation and limits

Construction takes 43–46% less time on Node, and 26–39% less on Bun in the pooled
paired results. Native byte/object transfers take 23–37% less on Node; delayed
attachment takes 29% less. Bun's ordinary transfer changes are small: -4% for
bytes, -1% for objects and +1% for delayed attachment. Controls and process
variation limit what can be inferred from those small differences.

Regressions remain. The one-byte-watermark stress case takes **31% more time on
Node** (about 3.3 microseconds per 16 KiB transfer) and **10% more on Bun** (about
1.5 microseconds). Sink replacement/completion takes **10% more on Node** (about
0.3 microseconds); Bun varies across processes and does not establish a reliable
improvement. The actual google-gax bidirectional wrapper takes **13% more on
Bun** (about 2.3 microseconds). Its Bun control varies by +6%, so the precise
regression size remains uncertain. The Node gax paired change is approximately
zero, with process changes from -8% to +7% and a +8% control.

The implementation trades upstream stream internals for native stream behavior,
validation and reliable teardown. These measurements do not isolate the cost of
each choice, nor establish an application or network throughput improvement.
All controls and regressions are retained. Fewer dependencies and correctness
fixes are separate claims from speed.

## Cases

Construction creates an unattached adapter and retains results. Transfer cases
send 32 chunks of 512 bytes (16 KiB total), or 32 object values, through a native
PassThrough. Delayed attachment queues writes/end before attaching that stream.
The backpressure stress case sets the child watermark to one byte; it deliberately
forces frequent drain handling. Both implementations use their default parent
watermarks. Completion and cleanup are included in transfer timing.

Replacement writes five bytes to the first sink, swaps to a second sink, and
ends with six bytes. The google-gax case uses the pinned **6.14.0 StreamProxy**
class over a native object-mode PassThrough, writes/reads 32 values, validates
their sum, and destroys the wrapper. Only duplexify changes between variants.
Network and cloud services are not involved. Correctness tests separately check
exact bytes, falsy values, cancellation, pending callbacks and actual Storage
HTTP upload/download callers.

## Reproduce

```sh
npm --prefix scripts/duplexify-conformance ci --ignore-scripts
npm --prefix scripts/retry-request-conformance ci --ignore-scripts
OUTPUT=packages/vduplexify/bench/results/node-1.json node packages/vduplexify/bench/compare.cjs
OUTPUT=packages/vduplexify/bench/results/bun-1.json bun packages/vduplexify/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vduplexify/bench/results/node-control.json node packages/vduplexify/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vduplexify/bench/results/bun-control.json bun packages/vduplexify/bench/compare.cjs
node packages/vduplexify/bench/summarize.cjs --verify-current
```

Run each comparison in three fresh processes (`1`, `2`, `3`). Do not run competing
tests or benchmarks during measurement. Source changes require new captures.
