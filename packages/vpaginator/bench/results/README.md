# vpaginator benchmark evidence

Published **@google-cloud/paginator 7.2.0** versus vpaginator, Node **24.22.1**
and Bun **1.4.0**, macOS arm64. Reports retain source/fixture hashes, timestamps,
runtime/CPU details and every sample.

Three fresh comparison processes and one identical-upstream control per runtime.
Each case has 150 ms warmup per variant and four warmup blocks, then 12
alternating paired rounds. A pilot targets 15 ms blocks, capped at 100,000
operations. Outputs are retained and validated outside timing. Nothing is trimmed.

Times below are pooled sample medians; changes are medians of paired ratios,
which need not equal the ratio of the time columns. Process changes are separate
paired medians. Negative values mean less time. Controls use upstream in both slots.

## Node

| Case | Upstream ns | VPM ns | Paired change | Process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| small query | 344 | 268 | -21.2% | -20.6%, -22.9%, -21.1% | +0.5% |
| nested query | 1,952 | 1,295 | -33.8% | -32.3%, -33.8%, -34.3% | +0.6% |
| manual delegation | 16 | 13 | -16.5% | -17.8%, -15.8%, -15.8% | +1.1% |
| one-page promise | 2,611 | 2,726 | +4.4% | +4.6%, +4.6%, +3.6% | +0.1% |
| one-page callback | 2,646 | 2,822 | +6.9% | +6.8%, +6.7%, +7.7% | -0.3% |
| ten-page promise | 15,900 | 19,741 | +23.4% | +25.2%, +22.7%, +23.9% | -0.3% |
| stream 128 objects | 10,669 | 13,904 | +31.6% | +31.6%, +29.9%, +37.8% | +0.3% |
| stream HWM 1 | 1,746,481 | 1,750,993 | -0.0% | +0.3%, -0.7%, +0.4% | -1.3% |

## Bun

| Case | Upstream ns | VPM ns | Paired change | Process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| small query | 181 | 73 | -60.1% | -59.2%, -61.4%, -59.7% | +0.1% |
| nested query | 1,911 | 755 | -60.6% | -59.9%, -60.9%, -60.9% | -0.1% |
| manual delegation | 16 | 4 | -77.0% | -76.7%, -77.2%, -77.2% | +29.6% |
| one-page promise | 2,058 | 2,449 | +26.3% | +29.6%, +9.7%, +14.8% | -0.2% |
| one-page callback | 2,223 | 2,665 | +19.2% | +21.2%, +20.2%, +17.3% | -0.3% |
| ten-page promise | 11,989 | 15,784 | +30.9% | +33.6%, +31.0%, +25.9% | +0.0% |
| stream 128 objects | 5,919 | 8,516 | +44.8% | +46.2%, +47.0%, +40.0% | +0.1% |
| stream HWM 1 | 144,398 | 165,187 | +15.1% | +17.2%, +14.2%, +14.9% | +4.2% |

## Interpretation and limits

Query preparation takes **21–34% less time on Node** and about **60–61% less
on Bun**, while retaining stricter validation and isolated queries. The tiny
manual-delegation measurement is especially sensitive to JIT specialization:
Bun’s identical-upstream control differs by 30%. It is not a useful application
performance claim.

Regressions remain: one-page aggregation takes **4–7% more time on Node** and
**19–26% more on Bun**; ten-page aggregation takes **23% / 31% more**. Delivering
128 objects takes **32% / 45% more**, about 3.2 / 2.6 microseconds per stream.
The slow-consumer, high-water-mark-one case is effectively unchanged on Node
and takes **15% more on Bun**, against a +4% control. Bun’s one-page promise
result varies between processes (10–30%); the precise pooled estimate should
not be treated as universal.

These are in-process mocked pages, not HTTP requests or Storage throughput.
Upstream pushes a complete page past the readable high-water mark; VPM honors
backpressure, snapshots the page and guards callback/cancellation state. Those
behavior differences are part of the measured operation. The harness does not
isolate the cost of each correctness change. One retained page can exceed the
readable queue size; automatic aggregation retains all collected records.

Reproduce from the repository root:

```sh
OUTPUT=packages/vpaginator/bench/results/node-1.json node packages/vpaginator/bench/compare.cjs
# Repeat with samples 2 and 3; then CALIBRATION=1 for node-control.json.
# Repeat with bun and bun-* output names.
node packages/vpaginator/bench/summarize.cjs --verify-current
```
