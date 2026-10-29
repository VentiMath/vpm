# vretry-request benchmark evidence

Published retry-request **9.1.0** versus vretry-request on Node **24.22.1** and
Bun **1.4.0**, macOS arm64. Raw reports record CPU, timestamps, runtime versions,
all samples and SHA-256 hashes of the implementations, fixture lock and harness.

Each runtime has three fresh comparison processes and one identical-upstream
control. Each case receives 150ms warmup per variant, four full warmup blocks,
then 12 alternating paired rounds. An upstream pilot targets 15ms per block,
capped at 100,000 operations. Outputs are retained and validated outside timing.
There is no trimming or discarded process. Negative changes mean less time.

Times below are medians of all raw samples. Percent changes are the median of
paired VPM/upstream ratios, so they need not equal the ratio of the two time
columns. Process ranges show each fresh process's paired median. Controls run
the same upstream implementation in both slots and expose ordering/runtime noise.

## Node

| Case | Upstream ns | VPM ns | Paired change | Process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| status 200 policy | 65 | 9 | -86.6% | -86.7%, -86.6%, -86.4% | +2.9% |
| status 503 policy | 61 | 9 | -85.4% | -85.3%, -85.6%, -85.3% | +0.3% |
| backoff calculation | 67 | 68 | +0.2% | -1.2%, -1.5%, +5.1% | +1.6% |
| successful callback | 414 | 201 | -51.5% | -51.4%, -52.6%, -51.0% | +1.3% |
| terminal callback error | 379 | 205 | -45.6% | -47.3%, -45.5%, -45.5% | -0.8% |
| asynchronous callback | 545 | 330 | -39.2% | -38.8%, -41.5%, -38.7% | -0.1% |
| 16KiB stream | 29,557 | 28,643 | -0.9% | -5.7%, -0.5%, +55.6% | -0.4% |
| 32 chunk stream | 31,117 | 32,636 | +4.2% | +1.3%, +5.9%, +6.0% | -6.5% |
| 32 object stream | 37,174 | 38,139 | +2.0% | +7.8%, -2.5%, +0.6% | -6.9% |
| HTTP callback with teeny-request | 212,919 | 206,611 | -0.2% | -9.6%, +0.7%, +0.1% | +2.3% |
| HTTP stream with teeny-request | 252,801 | 256,204 | -1.0% | -0.2%, -3.6%, +2.1% | +5.6% |

## Bun

| Case | Upstream ns | VPM ns | Paired change | Process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| status 200 policy | 37 | 3 | -90.9% | -90.8%, -91.4%, -90.8% | -6.6% |
| status 503 policy | 36 | 7 | -79.3% | -78.8%, -79.5%, -79.3% | -0.1% |
| backoff calculation | 47 | 44 | -5.2% | -5.1%, -4.5%, -17.7% | +2.7% |
| successful callback | 311 | 180 | -41.7% | -62.0%, -41.2%, -39.3% | +1.5% |
| terminal callback error | 251 | 163 | -36.6% | -42.4%, -37.1%, -32.5% | +0.2% |
| asynchronous callback | 420 | 286 | -32.7% | -30.6%, -37.6%, -24.6% | +0.9% |
| 16KiB stream | 10,276 | 10,421 | +4.2% | +11.0%, +5.0%, +0.3% | +0.5% |
| 32 chunk stream | 28,678 | 28,254 | -0.1% | -2.9%, +88.8%, -1.9% | -0.4% |
| 32 object stream | 31,781 | 32,004 | +1.7% | +3.3%, -2.1%, +1.5% | -1.2% |
| HTTP callback with teeny-request | 100,139 | 101,242 | -2.0% | -3.6%, -10.5%, +4.9% | -0.8% |
| HTTP stream with teeny-request | 152,764 | 142,140 | -0.9% | +0.8%, -0.9%, -10.9% | +15.7% |

## Interpretation

Callback setup/settlement is consistently faster: about 39–52% on Node and
33–42% on Bun in the combined paired medians. Supported option snapshots replace
upstream's general merge operation while retaining validation. The default status
policy avoids allocating retry-range arrays. The validated backoff helper is
approximately even on Node and slightly faster on Bun.

HTTP callback and stream differences are small relative to controls and process
variation; these results do not establish an HTTP throughput improvement.
Stream bookkeeping retains cancellation, cleanup, backpressure and per-attempt
isolation. Node's 32-chunk case is +4.2% and Bun's 16KiB case is +4.2% in paired
medians; other stream results are near parity. One Node 16KiB process is +55.6%
and one Bun 32-chunk process is +88.8%; both remain in the evidence. Several
stream/HTTP controls also vary materially, including +15.7% for Bun HTTP
streaming. Do not treat these cases as stable wins or promise a precise streaming
regression size from this run.

Callbacks use synchronous or microtask transports. Stream cases deliver 16KiB
as one chunk or 32 chunks, or 32 object-mode records. HTTP cases use the same
teeny-request 11.1.1 transport and local HTTP server with equivalent options.
These measure successful requests; retry sleeps are not treated as computational
work. Correct retry budgets, cancellation, failed-download recovery and deadline
settlement are verified separately by tests. No real cloud services are called.

## Reproduce

```sh
npm --prefix scripts/retry-request-conformance ci --ignore-scripts
OUTPUT=packages/vretry-request/bench/results/node-1.json node packages/vretry-request/bench/compare.cjs
OUTPUT=packages/vretry-request/bench/results/bun-1.json bun packages/vretry-request/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vretry-request/bench/results/node-control.json node packages/vretry-request/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vretry-request/bench/results/bun-control.json bun packages/vretry-request/bench/compare.cjs
node packages/vretry-request/bench/summarize.cjs --verify-current
```

Run each comparison in three fresh processes (`1`, `2`, `3`) before summarizing.
Run benchmarks without concurrent tests or other benchmark processes. Changes to
hashed source require new measurements; raw samples are never relabeled.
