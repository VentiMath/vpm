# vstream-events benchmark evidence

Published stream-events **1.0.5** (using stubs **3.0.0**) versus vstream-events on
Node **24.22.1** and Bun **1.4.0**, macOS arm64. Reports retain CPU, timestamps,
runtime versions, every sample and hashes of the source, fixture lock and harness.

Each runtime has three fresh comparison processes and one identical-upstream
control. Each case receives 150ms warmup per variant, four full warmup blocks,
then 12 alternating paired rounds. An upstream pilot targets 15ms per block,
capped at 100,000 operations. Outputs are retained and validated outside timing.
No samples or processes are discarded. Negative changes mean less time.

Times are medians of all raw samples. Changes are medians of paired ratios, so
they need not equal the ratio of the two time columns. Process changes retain
each process's paired median; controls put upstream in both measurement slots.

## Node

| Case | Upstream ns | VPM ns | Paired change | Process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| decorate own methods | 99 | 94 | -1.0% | -0.1%, +2.2%, -28.7% | +0.3% |
| decorate native PassThrough | 154 | 227 | +59.3% | +60.5%, +36.7%, +60.2% | -1.2% |
| decorate and first read/write | 259 | 230 | -14.9% | -15.4%, -16.8%, -0.3% | -0.7% |
| decorate and notify read/write | 337 | 307 | -9.7% | -10.7%, -12.6%, -6.6% | +0.7% |
| 100 reads after first notification | 634 | 485 | -24.3% | -23.7%, -24.6%, -26.0% | +0.4% |
| 32 chunk native stream | 7,527 | 5,586 | -31.6% | -30.4%, -30.1%, -32.8% | +1.0% |
| 32 object native stream | 10,637 | 8,182 | -22.0% | -22.2%, -26.7%, -21.5% | +0.9% |
| teeny-request HTTP stream | 168,319 | 185,230 | +1.3% | -8.2%, +28.1%, +9.3% | -0.9% |

## Bun

| Case | Upstream ns | VPM ns | Paired change | Process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| decorate own methods | 106 | 113 | +6.1% | +6.1%, +12.6%, -8.1% | -5.4% |
| decorate native PassThrough | 225 | 239 | +3.3% | +7.9%, +3.3%, +3.0% | -0.1% |
| decorate and first read/write | 340 | 210 | -37.4% | -36.3%, -38.6%, -41.6% | +0.6% |
| decorate and notify read/write | 383 | 259 | -37.7% | -36.6%, -37.9%, -39.2% | -1.4% |
| 100 reads after first notification | 569 | 348 | -37.5% | -37.1%, -43.2%, -36.3% | +0.1% |
| 32 chunk native stream | 10,611 | 7,369 | -30.4% | -30.3%, -30.5%, -29.3% | +0.7% |
| 32 object native stream | 11,101 | 7,775 | -28.4% | -28.1%, -29.1%, -28.6% | +0.9% |
| teeny-request HTTP stream | 78,926 | 79,663 | -1.1% | -0.9%, -4.0%, +5.1% | -0.8% |

## Interpretation

Native chunk/object stream processing takes 22–32% less time on Node and 28–30%
less on Bun. Independent hooks stop the repeated notifications caused by
upstream's shared counter. Restoring original functions also removes permanent
bound wrappers from subsequent calls. The native stream cases have no event
listeners and validate the same bytes/objects; unnecessary upstream emissions
still perform event lookup. First-use cases with listeners exercise the actual
notifications separately.

Validation adds setup work, particularly for methods inherited from stream
prototypes. Native PassThrough construction and decoration is **73 ns more on
Node** and **14 ns more on Bun** in the raw medians. The paired Node setup
regression is 59.3%; it is retained and is not a stream-throughput regression.
Own-method setup is approximately even on Node and costs 7 ns more on Bun in
the raw medians, with considerable variation between processes.

The HTTP case uses teeny-request 11.1.1 and a local server, changing only its
stream decorator. Node process changes range from -8.2% to +28.1%, while Bun
ranges from -4.0% to +5.1%. All processes remain in the evidence. These results
do not establish an HTTP throughput improvement or a precise regression size.

Synchronous cases cover decoration, first use with and without listeners, and
100 calls after notification. Native stream cases transfer 16 KiB in 32 chunks
or 32 object-mode values. Tests separately check reentrancy, method restoration,
validation, lazy downloading and exact delivery of a larger body. No cloud
services are called.

## Reproduce

```sh
npm --prefix scripts/retry-request-conformance ci --ignore-scripts
OUTPUT=packages/vstream-events/bench/results/node-1.json node packages/vstream-events/bench/compare.cjs
OUTPUT=packages/vstream-events/bench/results/bun-1.json bun packages/vstream-events/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vstream-events/bench/results/node-control.json node packages/vstream-events/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vstream-events/bench/results/bun-control.json bun packages/vstream-events/bench/compare.cjs
node packages/vstream-events/bench/summarize.cjs --verify-current
```

Run each comparison in three fresh processes (`1`, `2`, `3`) before summarizing.
Do not run competing tests or benchmarks during measurement. Source changes
require new reports; raw samples are never relabeled.
