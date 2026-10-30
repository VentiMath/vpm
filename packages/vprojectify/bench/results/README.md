# vprojectify benchmark evidence

Published **@google-cloud/projectify 6.2.1** versus vprojectify, Node **24.22.1**
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
| unchanged URL | 23 | 25 | +11.9% | +10.5%, +12.6%, +12.4% | -0.2% |
| single-token URL | 109 | 70 | -36.3% | -37.1%, -37.2%, -34.6% | +2.8% |
| three-token string | 151 | 140 | -7.5% | -7.6%, -7.2%, -8.6% | -1.2% |
| flat query record | 170 | 162 | -4.6% | -6.0%, -4.8%, -2.1% | +0.3% |
| nested request body | 2,655 | 1,469 | -44.9% | -44.9%, -43.8%, -45.2% | -1.2% |
| 100-item page | 86,921 | 46,602 | -46.1% | -47.3%, -45.7%, -45.8% | -0.2% |
| opaque buffer | 27 | 31 | +17.5% | +18.6%, +17.7%, +16.7% | +0.8% |

## Bun

| Case | Upstream ns | VPM ns | Paired change | Process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| unchanged URL | 22 | 25 | +15.0% | +15.3%, +14.9%, +15.0% | -0.1% |
| single-token URL | 96 | 38 | -61.1% | -61.2%, -61.2%, -60.1% | -0.6% |
| three-token string | 123 | 87 | -30.0% | -28.7%, -30.6%, -29.9% | +3.6% |
| flat query record | 122 | 146 | +20.8% | +17.8%, +22.7%, +16.0% | +0.3% |
| nested request body | 1,077 | 945 | -10.5% | -7.3%, -13.9%, -12.8% | +1.4% |
| 100-item page | 31,513 | 26,464 | -15.1% | -15.5%, -14.3%, -16.8% | +0.7% |
| opaque buffer | 16 | 13 | -20.3% | -23.4%, -19.9%, -17.9% | +8.0% |

## Interpretation and limits

Inputs rotate across eight URLs, project IDs and Buffer objects. Request
objects and arrays are freshly allocated per operation for both libraries,
because upstream and VPM mutate records. These measurements include that
allocation cost and do not isolate substitution alone.

An earlier fixed-input experiment allowed very small Bun cases to specialize
around constants and produced an unstable multi-token result. Its original
script and all eight raw reports remain under `bench/exploratory-fixed-input/`;
the tables above use only the revised varying-input harness. No samples or
processes from the current harness are trimmed.

Single-token substitution takes **36% less time on Node** and **61% less on
Bun**. Nested bodies and 100-item pages take **45–46% less on Node** and
**11–15% less on Bun**. Multi-token substitution also improves in all three
current comparison processes.

Regressions remain on tiny inputs: unchanged URLs take **12% / 15% more**
(Node / Bun), roughly 2–3 ns; opaque Buffer dispatch takes **18% more on Node**,
roughly 4 ns. Bun flat records take **21% more**, about 24 ns. The Bun Buffer
gain has an +8% identical-upstream control, so its exact size is uncertain.

These are local helper timings, not HTTP or Storage throughput. Small absolute
costs, process variation and identical-upstream controls matter alongside the
percentage changes. The correctness fixes are independent claims.

Reproduce from the repository root:

```sh
OUTPUT=packages/vprojectify/bench/results/node-1.json node packages/vprojectify/bench/compare.cjs
# Repeat with samples 2 and 3; use CALIBRATION=1 for node-control.json.
# Repeat with bun and bun-* output filenames.
node packages/vprojectify/bench/summarize.cjs --verify-current
```
