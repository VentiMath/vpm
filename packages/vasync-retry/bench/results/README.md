# vasync-retry paired benchmarks

Baseline: **async-retry 1.3.3 / retry 0.13.1**. Recorded October 30, 2026 on Apple M1 Pro,
darwin arm64; Node.js 24.22.1 and Bun 1.4.0. Values below
are nanoseconds per operation, with **lower being better**.

Each runtime has three fresh-process reports and one identical-upstream control.
Every case receives at least 150ms of warmup per implementation and four full
warmup blocks, then twelve paired rounds alternating measurement order. A 15ms
upstream pilot selects the iteration count, capped at 100,000. Outputs are retained
and validated outside timing; no samples are trimmed. Variable cases cycle through
inputs; default-policy and reset cases intentionally repeat the same policy.

Times are medians across 36 samples. Changes are medians of paired ratios,
so they need not equal the ratio of the displayed medians. Process changes show
all three per-process medians. Control changes measure identical code in both
slots and indicate noise; they are not subtracted from results.

## Node

| Case | Upstream ns | VPM ns | Paired change | Three process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| sync success default policy | 1,101 | 939 | -14.6% | -15.2%, -14.9%, -13.0% | -0.1% |
| async success configured policy | 608 | 461 | -23.7% | -23.4%, -23.8%, -23.6% | -0.1% |
| thenable success | 431 | 433 | +0.4% | +1.3%, -0.7%, +0.4% | +0.2% |
| terminal sync failure | 1,288 | 1,123 | -14.0% | -13.3%, -14.5%, -11.7% | +1.5% |
| terminal promise rejection | 1,025 | 851 | -17.0% | -18.2%, -15.8%, -16.0% | -1.2% |
| explicit bail | 1,200 | 847 | -29.7% | -30.4%, -29.6%, -29.9% | +0.9% |
| one retry including 1ms timer | 1,233,010 | 1,262,525 | +5.2% | +4.4%, +3.1%, +17.1% | +6.7% |

## Bun

| Case | Upstream ns | VPM ns | Paired change | Three process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| sync success default policy | 956 | 538 | -43.7% | -43.4%, -44.3%, -44.0% | +0.8% |
| async success configured policy | 547 | 351 | -37.3% | -41.3%, -42.0%, -34.9% | -0.3% |
| thenable success | 431 | 447 | +5.3% | +7.5%, +4.5%, +3.1% | -0.6% |
| terminal sync failure | 849 | 819 | -1.9% | -2.8%, -1.0%, -1.4% | +3.9% |
| terminal promise rejection | 579 | 498 | -13.5% | -14.2%, -13.6%, -11.3% | -1.9% |
| explicit bail | 635 | 453 | -29.9% | -30.8%, -29.8%, -29.5% | +0.5% |
| one retry including 1ms timer | 1,171,042 | 1,177,676 | +0.3% | +0.1%, +0.1%, +2.5% | -2.7% |

## Interpretation

Default synchronous success takes 15% / 44% less time on Node / Bun; configured
async success takes 24% / 37% less. Explicit bail takes about 30% less on each.
Node thenable success is essentially unchanged, and Bun thenables regress by
about 5% (431 → 447ns). Bun's small synchronous-failure improvement is within the
control's variation and is not a firm performance claim.

The real 1ms-backoff case is dominated by timer scheduling. Node's measured +5.2%
change accompanies a +6.7% identical-code control and process changes from +3.1%
to +17.1%; Bun is essentially unchanged. These samples do not establish a CPU
regression or a retry-latency improvement. No external network is timed.

## Reproduce and inspect

```sh
npm --prefix scripts/retry-conformance ci --ignore-scripts
OUTPUT=/tmp/vasync-retry-node.json node packages/vasync-retry/bench/compare.cjs
CALIBRATION=1 OUTPUT=/tmp/vasync-retry-control.json node packages/vasync-retry/bench/compare.cjs
node packages/vasync-retry/bench/summarize.cjs --verify-current
```

Repeat measurement with `bun`. The eight JSON files in this directory retain all
samples, iteration counts, runtime versions, source/fixture hashes and checksums.
The summary command verifies consistent hashes and cases; `--verify-current`
also checks that recorded sources still match the working tree.
