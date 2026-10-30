# vagent-base benchmark results

Compared with **agent-base 9.0.0** on Apple M1 Pro, macOS arm64, using Node
24.22.1 and Bun 1.4.0. Reports retain runtime versions, CPU, timestamps, all samples
and source/fixture/harness hashes. Positive percentages mean VPM takes more time.

Each runtime has three fresh measurement processes and one identical-upstream
control. Each case uses 12 alternating paired rounds, 200 ms warmup per variant,
four full-block warmups and a 20 ms upstream pilot target, capped at 100,000
operations per block. Outputs are retained and validated outside timing. No
samples or processes are discarded; runs are sequential without competing tests.

Times are median nanoseconds across the 36 raw samples. Changes are medians of
paired ratios, which need not equal the ratio of the two aggregate times.
Process changes list each fresh process's paired median. Controls measure
upstream in both slots; they expose noise and are not subtracted from results.

## Node 24

| Case | Upstream ns | VPM ns | Paired change | Process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| agent construction | 395 | 785 | +97.5% | +105.4%, +92.7%, +97.5% | +1.0% |
| protocol inference | 12,773 | 11,226 | -11.8% | -11.1%, -11.7%, -12.8% | +2.2% |
| HTTP pool name | 42 | 48 | +14.7% | +25.3%, +12.0%, +14.9% | -4.0% |
| TLS pool name | 161 | 167 | +4.3% | +2.7%, +5.2%, +4.0% | -0.4% |
| collect one 16KiB chunk | 1,416 | 1,377 | -4.8% | -14.9%, +2.7%, -7.2% | +0.1% |
| collect 32 chunks | 6,431 | 8,599 | +22.0% | +14.5%, +40.6%, +32.6% | -3.5% |
| collect 16KiB Readable | 3,141 | 3,271 | +0.6% | +4.1%, -4.2%, +3.1% | +6.2% |
| collect 32-chunk Readable | 16,535 | 18,434 | +11.2% | -2.5%, +12.5%, +11.3% | -3.0% |
| parse JSON | 1,039 | 1,039 | -0.3% | -9.2%, +0.1%, +2.4% | +1.3% |
| reject malformed JSON | 4,748 | 6,911 | +46.8% | +36.7%, +43.9%, +48.7% | -1.9% |
| HTTP keep-alive | 146,939 | 139,366 | -7.0% | -7.8%, -4.3%, -8.3% | -1.2% |
| HTTP fresh sync connect | 277,157 | 254,132 | -7.7% | -8.1%, -7.9%, -6.9% | +0.1% |
| HTTP fresh async connect | 266,697 | 266,555 | +1.4% | +0.7%, +0.8%, +3.2% | +4.2% |
| HTTPS keep-alive | 170,775 | 164,995 | -1.6% | +0.4%, -8.4%, +7.4% | -1.5% |
| eight queued HTTP requests | 1,270,254 | 1,224,044 | -5.8% | -8.7%, -3.0%, -4.9% | +9.0% |
| HTTP structural delegation | 149,350 | 146,122 | -2.0% | -5.7%, -1.5%, -0.6% | -2.9% |

## Bun 1.4

| Case | Upstream ns | VPM ns | Paired change | Process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| agent construction | 309 | 474 | +48.3% | +39.6%, +68.0%, +39.3% | -2.6% |
| protocol inference | 3,454 | 4,784 | +38.6% | +40.5%, +37.0%, +41.0% | -1.4% |
| HTTP pool name | 28 | 18 | -38.6% | -40.3%, -28.8%, -40.4% | -4.6% |
| TLS pool name | 178 | 186 | +3.7% | +11.1%, +0.3%, -4.3% | +0.1% |
| collect one 16KiB chunk | 1,925 | 1,922 | -3.3% | +9.6%, -6.2%, -2.5% | -3.6% |
| collect 32 chunks | 5,556 | 11,424 | +99.6% | +98.1%, +100.8%, +101.5% | -0.8% |
| collect 16KiB Readable | 3,718 | 3,651 | -1.8% | -0.3%, +0.3%, -3.8% | -3.9% |
| collect 32-chunk Readable | 12,173 | 19,199 | +52.2% | +45.3%, +58.8%, +54.2% | +1.3% |
| parse JSON | 683 | 674 | +2.4% | +2.2%, +0.7%, +17.9% | -0.4% |
| reject malformed JSON | 2,569 | 2,862 | +9.3% | +8.5%, +9.5%, +10.1% | -1.6% |
| HTTP keep-alive | 111,821 | 117,672 | +10.1% | -2.9%, +3.9%, +13.4% | -6.1% |
| HTTP fresh sync connect | 317,094 | 302,775 | +14.0% | +21.9%, +14.0%, +5.1% | +1.4% |
| HTTP fresh async connect | 352,451 | 366,029 | +11.1% | -3.9%, +16.7%, -5.8% | -6.2% |
| HTTPS keep-alive | 163,647 | 178,052 | +7.2% | +19.3%, -6.0%, +13.8% | -5.8% |
| eight queued HTTP requests | 911,257 | 961,541 | +6.6% | +9.0%, +1.2%, +12.4% | +7.2% |
| HTTP structural delegation | 145,585 | 170,456 | +19.8% | +14.4%, +25.8%, +22.4% | -4.3% |

## Interpretation and remaining costs

Node HTTP keep-alive and fresh synchronous connections take about 7% and 8%
less paired time, consistently across processes. Node async connections, HTTPS,
queued batches and structural delegation do not establish a clear improvement
against their variation and controls. Bun transport medians are 7–20% slower,
with wide variation in several cases. Its fresh synchronous connections are
+14.0% and structural delegation +19.8%, positive in all three processes; these
remain measured regressions. Other Bun cases overlap substantial process/control
noise. These results do not establish application-wide throughput changes.

Construction adds about **390 ns on Node** and **165 ns on Bun**, including
configuration validation and private lifecycle state. Structured protocol
inspection takes 12% less time on Node but 39% more on Bun (about 1.3 microseconds).
It avoids custom error formatters on these runtimes. HTTP/TLS pool-name deltas
are at most ten nanoseconds in the aggregate medians.

Copying bytes before the next chunk protects against producer buffer reuse.
The 32-chunk iterable costs about 2.2 microseconds more on Node and 5.9 on Bun;
native Readable collection costs about 1.9/7.0 microseconds more. A single chunk
or valid JSON is broadly unchanged relative to variation. Malformed JSON
constructs a sanitized SyntaxError without disclosing response contents, adding
about 2.2 microseconds on Node and 0.3 on Bun. These helper implementations and
construction validation are retained from the prior version.

HTTP/TLS use local servers and equivalent connection options. Fresh cases
disable keep-alive; eight queued requests share a warm connection with
`maxSockets: 1`. Structural delegation returns an object whose `addRequest`
forwards to a dedicated native keep-alive agent. Collection uses identical
iterable/Readable byte inputs; 32 chunks total 16 KiB. Rejected connections,
queue recovery, cancellation, deadlines and shared-delegate protection are tested
separately, including behaviors that can hang upstream. No cloud services run.

The [7.1.4 comparison](../results-7.1.4/README.md) is retained as historical
evidence from its original commit. It is not relabeled as a current comparison.

## Reproduce

```sh
npm --prefix scripts/agent-conformance ci --ignore-scripts
OUTPUT=packages/vagent-base/bench/results/node-1.json node packages/vagent-base/bench/compare.cjs
OUTPUT=packages/vagent-base/bench/results/bun-1.json bun packages/vagent-base/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vagent-base/bench/results/node-control.json node packages/vagent-base/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vagent-base/bench/results/bun-control.json bun packages/vagent-base/bench/compare.cjs
node packages/vagent-base/bench/summarize.cjs --verify-current
```

Repeat comparisons in fresh processes with suffixes `-2` and `-3`. Source changes
require new measurements; raw reports are never relabeled.
