# vretry paired benchmarks

Baseline: **retry 0.13.1**. Recorded October 30, 2026 on Apple M1 Pro,
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
| default ten-delay schedule | 281 | 128 | -54.1% | -52.5%, -54.6%, -55.0% | -0.2% |
| capped five-delay schedule | 254 | 193 | -23.3% | -24.6%, -23.3%, -19.7% | +0.2% |
| configured operation creation | 445 | 261 | -41.7% | -41.9%, -41.1%, -41.7% | +1.1% |
| reset reusable operation | 21 | 36 | +72.7% | +68.6%, +73.1%, +73.6% | +9.3% |
| count 32 error messages | 543 | 622 | +14.3% | -5.0%, +14.4%, +16.4% | -0.1% |
| wrap one callback method | 50 | 687 | +1282.7% | +1275.6%, +1287.0%, +1301.3% | +1.2% |
| wrapped successful call | 656 | 415 | -37.0% | -37.3%, -35.5%, -37.5% | +0.5% |

## Bun

| Case | Upstream ns | VPM ns | Paired change | Three process changes | Control |
| --- | ---: | ---: | ---: | --- | ---: |
| default ten-delay schedule | 201 | 44 | -77.1% | -80.9%, -77.1%, -75.9% | +0.6% |
| capped five-delay schedule | 180 | 52 | -70.3% | -69.6%, -70.0%, -73.0% | -1.2% |
| configured operation creation | 423 | 131 | -71.1% | -70.2%, -71.3%, -71.4% | -0.9% |
| reset reusable operation | 17 | 32 | +114.7% | +136.9%, +133.8%, +0.8% | -14.3% |
| count 32 error messages | 282 | 292 | +3.8% | +3.2%, +5.3%, +4.3% | -0.6% |
| wrap one callback method | 59 | 481 | +678.2% | +702.0%, +678.2%, +765.7% | -0.7% |
| wrapped successful call | 579 | 269 | -53.1% | -52.5%, -53.7%, -53.8% | -0.1% |

## Interpretation

Schedule construction and successful wrapped calls take less CPU time on both
runtimes. Operation creation takes about 42% less on Node and 71% less on Bun.
Reset performs additional state/timer cleanup: 21 → 36ns on Node and 17 → 32ns on
Bun, with substantial variation in these tiny cases. Safe error counting is 543 →
622ns on Node and 282 → 292ns on Bun; Node's per-process direction varies.

Callback-wrapper construction is a clear regression: **50 → 687ns on Node and
59 → 481ns on Bun**. It now validates configuration, preflights property
replacement, avoids accessor execution and freezes a private option snapshot.
The SDK caller uses `operation` through vasync-retry, not `wrap`; code that creates
wrappers on every request should move that setup out of the hot path. Successful
calls through an existing wrapper take 37% / 53% less time here. No claim is made
that every operation improved or that cloud-request latency changed.

## Reproduce and inspect

```sh
npm --prefix scripts/retry-conformance ci --ignore-scripts
OUTPUT=/tmp/vretry-node.json node packages/vretry/bench/compare.cjs
CALIBRATION=1 OUTPUT=/tmp/vretry-control.json node packages/vretry/bench/compare.cjs
node packages/vretry/bench/summarize.cjs --verify-current
```

Repeat measurement with `bun`. The eight JSON files in this directory retain all
samples, iteration counts, runtime versions, source/fixture hashes and checksums.
The summary command verifies consistent hashes and cases; `--verify-current`
also checks that recorded sources still match the working tree.
