# vjwks-rsa benchmark evidence

Compared with unmodified `jwks-rsa` 3.2.2 on Apple M1 Pro, macOS arm64,
Node 24.22.1 and Bun 1.4.0. Recorded October 28, 2026 (October 29 UTC).
These are package microbenchmarks and local HTTP measurements, not application
latency or production throughput measurements.

## Method

The [harness](../compare.cjs) runs three fresh processes per runtime plus one
identical-upstream control. Each case warms both variants for at least 200 ms,
then runs four complete warm-up blocks and twelve balanced, alternating paired
rounds. A warmed upstream pilot targets 20 ms per block, bounded to 1–100,000
operations. Both variants use the same operation count. Every sample is retained;
none are trimmed. Each JSON report records source/dependency hashes, runtime,
CPU, operation counts, checksum and raw nanoseconds per operation.

Outputs are retained in a ring and consumed after each block. Validation occurs
before and after timing, comparing PEMs by exact SPKI bytes: upstream's Bun
WebCrypto path omits a trailing newline present in native exports. Import cases
include actual PEM export. The repeated-export case starts warm. The synthetic
eight-key set alternates one RSA and one EC public key under eight distinct IDs.
Concurrent cases create fresh clients. The custom-fetcher scenario also asserts
eight upstream fetches versus one VPM fetch. HTTP cases use the same local server
and equivalent keep-alive agents. No internet requests are timed.

Time changes are medians of 36 paired VPM/upstream ratios, not ratios of separately
pooled medians. The process range contains each fresh process's median paired
change. Paired time differences are medians of the 36 VPM-minus-upstream samples.
A negative value means less time. The control compares upstream against itself
using the same harness; it is a noise check, not a correction applied to results.
Shorter initial warm-up trials showed unstable controls and were replaced with
this longer, fixed protocol before recording these results.

## Node 24

| Operation | Paired time change | Three-process range | Paired difference (ns) | Identical-code control |
| --- | ---: | ---: | ---: | ---: |
| client creation | -93.6% | -94.2% to -93.0% | -16,624 | -0.2% |
| cached key Promise | -99.3% | -99.3% to -99.1% | -20,399 | +1.1% |
| cached key callback | -98.7% | -98.7% to -98.4% | -22,712 | +0.7% |
| RSA import and PEM | +7.0% | +5.2% to +7.5% | +2,800 | +3.8% |
| EC import and PEM | -2.3% | -6.4% to -1.7% | -2,117 | +4.3% |
| eight-key import and PEM | -1.4% | -5.4% to +22.6% | -7,485 | +15.5% |
| repeated PEM export | -99.9% | -99.9% to -99.9% | -27,992 | -1.0% |
| concurrent eight-kid misses | -65.0% | -70.3% to -63.0% | -1,612,175 | -5.7% |
| missing-kid rejection | +17.3% | +16.0% to +18.0% | +1,944 | -2.4% |
| Express cached key provider | -99.4% | -99.5% to -99.4% | -59,454 | +2.2% |
| HTTP sequential key miss | +1.0% | -1.5% to +6.7% | +5,325 | +12.2% |
| HTTP concurrent eight-kid misses | -65.8% | -68.8% to -60.2% | -1,468,396 | -6.2% |

## Bun 1.4

| Operation | Paired time change | Three-process range | Paired difference (ns) | Identical-code control |
| --- | ---: | ---: | ---: | ---: |
| client creation | -85.9% | -85.9% to -85.6% | -2,925 | -0.8% |
| cached key Promise | -93.7% | -94.1% to -91.0% | -1,795 | -5.8% |
| cached key callback | -91.3% | -91.8% to -90.0% | -2,906 | -5.7% |
| RSA import and PEM | -23.8% | -26.3% to -22.0% | -1,475 | -3.3% |
| EC import and PEM | -5.6% | -9.1% to -0.1% | -710 | -2.9% |
| eight-key import and PEM | -22.4% | -22.6% to -22.3% | -17,152 | -1.8% |
| repeated PEM export | -8.3% | -10.4% to +4.6% | -1 | -0.3% |
| concurrent eight-kid misses | -89.1% | -89.3% to -88.7% | -560,954 | +4.3% |
| missing-kid rejection | -62.4% | -66.6% to -60.1% | -6,438 | -2.2% |
| Express cached key provider | -83.6% | -85.0% to -82.8% | -1,567 | -0.4% |
| HTTP sequential key miss | -28.8% | -36.2% to -26.1% | -58,288 | -1.2% |
| HTTP concurrent eight-kid misses | -83.8% | -86.3% to -80.5% | -1,018,010 | +1.1% |

## Interpretation

The large cache and concurrency improvements survive the process ranges and
controls. Node cached Promise/callback lookups take about 99% less time, while
Bun takes about 94%/91% less. Pending work is shared across IDs, cutting eight
custom-fetcher requests to one. Eight concurrent local HTTP lookups take about
66% less time on Node and 84% less on Bun. PEM memoization removes repeated native
export on Node; upstream Bun already retains an exported PEM, so its nanosecond
repeat-access difference has no practical significance.

**Remaining Node costs:** fresh RSA import/export is about 7% slower (2.8 µs extra
per operation), and missing-key rejection about 17% slower (1.9 µs extra). These
paths retain canonical-field/purpose checks, immutable records and deadlines for
custom fetchers. Their rejection and resource-handling checks remain enabled.

Node eight-key import and sequential HTTP results are inconclusive: process
ranges cross zero, and their identical-code controls move by about 15.5% and
12.2%. The small Node EC change is also within the control's scale. No speedup is
claimed for those cases. Bun RSA and eight-key imports improve about 24% and 22%;
sequential local HTTP improves about 29%. Bun's EC improvement is smaller and
varies from essentially flat to 9% faster. Network latency, issuer behavior and
application work can dominate these package-level differences.

## Reproduce

From the repository root, with the pinned consumer fixture installed:

```sh
npm --prefix scripts/consumers ci --ignore-scripts
OUTPUT=/tmp/vjwks-node.json node packages/vjwks-rsa/bench/compare.cjs
OUTPUT=/tmp/vjwks-bun.json bun packages/vjwks-rsa/bench/compare.cjs
CALIBRATION=1 OUTPUT=/tmp/vjwks-control.json node packages/vjwks-rsa/bench/compare.cjs
node packages/vjwks-rsa/bench/summarize.cjs --verify-current
```

Repeat measured runs in fresh processes; use `CALIBRATION=1` on each runtime for
its control. The summarizer requires three measured reports and one control per
runtime, verifies case/source consistency, and optionally checks current files.
[`node-1.json`](node-1.json), [`node-2.json`](node-2.json),
[`node-3.json`](node-3.json), [`node-control.json`](node-control.json),
[`bun-1.json`](bun-1.json), [`bun-2.json`](bun-2.json),
[`bun-3.json`](bun-3.json) and [`bun-control.json`](bun-control.json) contain the
complete recorded evidence.
