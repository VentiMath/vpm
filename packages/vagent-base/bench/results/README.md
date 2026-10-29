# vagent-base benchmark results

Compared with agent-base 7.1.4 on Apple M1 Pro, macOS arm64, using Node 24.22.1 and
Bun 1.4.0. Raw reports record precise runtime versions, CPU, timestamps and input
hashes. Positive percentages mean VPM took more time; negative means less.

Each runtime has three fresh measurement processes and one identical-upstream
control. Each case uses 12 alternating paired rounds, 200 ms per-variant warmup,
four full-block warmups, and a 20 ms upstream pilot target. Results are retained,
consumed and validated outside timing. No samples are trimmed. HTTP and TLS use
local servers with identical client settings. The eight-request batch starts
with a warm connection and maxSockets=1. Collection compares both plain iterables
and native Readable streams; 32 chunks total 16 KiB. Failure/cancellation behavior
that hangs upstream is tested separately and is not assigned a speed ratio.

Times below are median nanoseconds per operation across the 36 measured samples.
Change is the median of the **paired ratios**, which need not equal the ratio of
those two aggregate medians. The process range lists the three process-specific
paired changes. Control compares upstream against itself and indicates timing
bias, not an adjustment subtracted from measured results.

## Node 24

| Case | Upstream ns | VPM ns | Paired change | Process range | Control |
| --- | ---: | ---: | ---: | ---: | ---: |
| agent construction | 381 | 681 | +79.7% | +77.4 to +82.6% | +0.7% |
| protocol inference | 12,325 | 10,920 | -11.3% | -11.7 to -10.6% | +3.2% |
| HTTP pool name | 39 | 45 | +15.6% | +15.1 to +16.9% | +0.0% |
| TLS pool name | 146 | 161 | +11.1% | +10.1 to +11.8% | -0.6% |
| collect one 16KiB chunk | 1,184 | 1,156 | -1.4% | -4.5 to +1.3% | +1.2% |
| collect 32 chunks | 6,278 | 7,900 | +23.1% | +23.0 to +23.6% | -1.6% |
| collect 16KiB Readable | 2,748 | 2,787 | +1.4% | -3.0 to +14.5% | -0.1% |
| collect 32-chunk Readable | 13,724 | 14,739 | +8.3% | +7.4 to +8.7% | -0.3% |
| parse JSON | 946 | 954 | +1.6% | -4.6 to +2.3% | -23.8% |
| reject malformed JSON | 4,677 | 6,805 | +46.4% | +40.1 to +48.5% | +1.1% |
| HTTP keep-alive | 116,339 | 108,495 | -8.0% | -15.9 to -5.5% | +0.5% |
| HTTP fresh sync connect | 195,465 | 189,655 | -4.3% | -9.4 to +1.3% | -3.8% |
| HTTP fresh async connect | 204,705 | 204,999 | -1.0% | -3.2 to +3.4% | +3.4% |
| HTTPS keep-alive | 136,493 | 129,930 | -6.1% | -11.8 to -3.7% | +0.8% |
| eight queued HTTP requests | 1,121,176 | 1,085,425 | -6.2% | -7.2 to -5.3% | +4.7% |

## Bun 1.4

| Case | Upstream ns | VPM ns | Paired change | Process range | Control |
| --- | ---: | ---: | ---: | ---: | ---: |
| agent construction | 256 | 379 | +50.1% | +35.3 to +53.4% | +3.1% |
| protocol inference | 3,302 | 4,296 | +33.5% | +31.0 to +35.4% | -0.3% |
| HTTP pool name | 41 | 16 | -51.2% | -57.5 to +2.4% | -4.1% |
| TLS pool name | 164 | 170 | +4.1% | +3.4 to +5.0% | +3.4% |
| collect one 16KiB chunk | 1,490 | 1,492 | +1.1% | -0.1 to +6.7% | -1.3% |
| collect 32 chunks | 4,285 | 8,259 | +98.0% | +89.3 to +103.5% | +0.3% |
| collect 16KiB Readable | 2,954 | 2,896 | -2.5% | -4.3 to -0.3% | -1.1% |
| collect 32-chunk Readable | 10,835 | 15,424 | +43.2% | +38.1 to +53.4% | +0.7% |
| parse JSON | 592 | 612 | +6.4% | +1.8 to +11.3% | +0.0% |
| reject malformed JSON | 1,912 | 2,093 | +10.1% | +9.0 to +22.5% | -3.2% |
| HTTP keep-alive | 72,891 | 76,113 | +2.8% | -2.6 to +10.0% | +2.2% |
| HTTP fresh sync connect | 162,620 | 166,022 | +0.7% | -11.4 to +5.3% | +3.5% |
| HTTP fresh async connect | 164,911 | 192,879 | +9.2% | +7.5 to +12.7% | +0.2% |
| HTTPS keep-alive | 110,261 | 108,569 | +4.5% | +0.0 to +18.2% | -4.7% |
| eight queued HTTP requests | 577,237 | 665,218 | +10.8% | +1.8 to +19.5% | -5.9% |

## Interpretation and remaining costs

Node HTTP/HTTPS keep-alive takes about 8%/6% less paired time. Fresh connection
results are close enough to process spread/control drift that they do not
establish a reliable speedup. Bun's fresh asynchronous connects take about 9%
more time, and its queued batch about 11% more with a broad process range.
Bun keep-alive results vary too much for a general improvement claim.

Construction costs an additional 0.30 microseconds on Node and 0.12 on Bun.
Native state plus configuration validation and private bookkeeping are included;
reusing agents amortizes creation. Structured protocol inspection takes 11%
less time on Node but 34% more on Bun (about 1 microsecond extra). It remains
independent of custom error formatters on these runtimes. Node HTTP/TLS pool-key
checks add about 6/15 nanoseconds. The large Bun HTTP-name percentage is unstable
across processes and should not be treated as an application benefit.

Copying bytes before the next chunk protects against producer buffer reuse.
The 32-chunk iterable costs roughly 1.6 microseconds more on Node and 4 on Bun;
native Readable collection costs about 1/4.6 microseconds more. A single chunk
is broadly unchanged. Growth avoids allocating a separate copy per chunk but
still performs work absent from upstream's deferred Buffer.concat.

Malformed JSON constructs a new sanitized SyntaxError instead of exposing the
original response in its message, adding about 2.1 microseconds on Node and
0.18 on Bun. Valid JSON measurements do not support a strong claim: Node's
identical-upstream control moved by 24%, while Bun's measured change was +6%.
The connection cancellation/deadline bookkeeping is included in transport costs.
No whole-application throughput, latency or security improvement is inferred.

## Reproduce

Install the pinned consumer fixture and workspace first. Run three fresh
processes per runtime and one control, preserving the output reports:

```sh
OUTPUT=packages/vagent-base/bench/results/node-1.json node packages/vagent-base/bench/compare.cjs
OUTPUT=packages/vagent-base/bench/results/bun-1.json bun packages/vagent-base/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vagent-base/bench/results/node-control.json node packages/vagent-base/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vagent-base/bench/results/bun-control.json bun packages/vagent-base/bench/compare.cjs
node packages/vagent-base/bench/summarize.cjs --verify-current
```

Repeat the measured commands with suffixes `-2` and `-3`. The summary verifies
all eight reports and their input hashes; keep other CPU-intensive work idle.
