# vjsonwebtoken benchmark results

Node 24.22.1 and Bun 1.4.0, macOS arm64. Raw JSON reports record the CPU, full
runtime versions, timestamps, every sample and source hashes, including the
pinned upstream dependency tree. The upstream target is `jsonwebtoken` 9.0.3.

## Method

Three variants run in each process: unchanged upstream; upstream with `vjws` and
`vms` substituted (bridge); and `vjsonwebtoken`. Twelve rounds use all six orders
twice. A baseline pilot targets 10 ms blocks, with 16–100,000 synchronous or
1–100,000 callback operations. Each variant receives 128 synchronous or two async
calls, then five full warmup blocks with changing order. Results are validated
before timing, retained during timing and consumed afterward. No samples are
trimmed. Three fresh processes per runtime and one identical-upstream control
run sequentially, without concurrent test suites.

Tables show pooled median microseconds per operation and the median of 36 paired
VPM/upstream ratios. The percentage need not equal the ratio of displayed medians.
Negative changes mean less elapsed time. Per-process ratios, bridge timings and
all controls are reproduced by [the summary script](../summarize.cjs):

```sh
node packages/vjsonwebtoken/bench/summarize.cjs --verify-current
```

KeyObject cases exclude import; string secrets include native secret import.
Public PEM strings use a warm bounded cache, while mutable PEM Buffers include
uncached import on every operation. No private-key or shared-secret cache is used.
JWT timestamps and verification clocks are fixed. Callback cases include Promise
scheduling. Changing-header verification rotates 257 prebuilt key IDs. Large
payloads contain 64 KiB of ASCII text in a JSON object; all variants process the
same bytes. Verification checks signature, audience, issuer and time claims.

The controls range from −4.5% to +3.1% on Node and −5.4% to +18.1% on Bun. Bun's
largest control difference is callback signing (+18.1%), followed by signing
with claims (+9.3%); its HMAC signing process estimates also vary (48–61% less
time). These controls are noise indicators, not correction factors. Small
single-digit changes should be interpreted cautiously. The larger HMAC gains
persist in all three processes.

## Node 24.22.1

| Operation | Upstream µs | Bridge µs | VPM µs | VPM vs upstream |
|---|---:|---:|---:|---:|
| HS256 sign | 17.29 | 16.19 | 5.80 | -66.4% |
| HS256 verify | 22.18 | 20.91 | 5.95 | -74.0% |
| RS256 sign | 566.84 | 565.26 | 562.38 | -2.0% |
| RS256 verify | 22.58 | 21.63 | 22.31 | -1.4% |
| RS256 verify warm PEM | 42.52 | 42.21 | 21.86 | -48.4% |
| RS256 verify uncached PEM Buffer | 41.66 | 42.20 | 42.88 | +3.0% |
| PS256 sign | 566.79 | 564.18 | 564.13 | -0.6% |
| PS256 verify | 23.51 | 22.54 | 22.70 | -2.4% |
| PS256 verify warm PEM | 43.04 | 55.96 | 22.41 | -48.0% |
| PS256 verify uncached PEM Buffer | 42.77 | 55.46 | 56.31 | +32.2% |
| ES256 sign | 28.20 | 26.56 | 26.95 | -3.6% |
| ES256 verify | 61.57 | 62.21 | 61.61 | +0.1% |
| ES256 verify warm PEM | 79.01 | 79.81 | 61.53 | -22.1% |
| ES256 verify uncached PEM Buffer | 77.89 | 79.15 | 80.41 | +2.9% |
| HS256 sign with claims | 19.56 | 18.27 | 6.21 | -68.8% |
| HS256 verify KeyObject | 4.41 | 3.48 | 3.97 | -9.8% |
| decode complete | 1.58 | 0.94 | 0.94 | -40.0% |
| HS256 sign 64 KiB | 116.03 | 106.61 | 94.12 | -17.6% |
| HS256 verify 64 KiB | 180.05 | 134.21 | 113.09 | -36.6% |
| HS256 verify varying header | 24.15 | 23.69 | 5.88 | -75.7% |
| reject expired | 38.00 | 36.19 | 18.48 | -50.7% |
| reject bad signature | 36.42 | 35.03 | 16.96 | -53.1% |
| HS256 callback sign | 21.50 | 21.25 | 5.81 | -73.1% |
| HS256 callback verify | 22.93 | 21.51 | 5.34 | -76.8% |
| HS256 resolver verify | 22.70 | 21.39 | 5.43 | -76.0% |

## Bun 1.4.0

| Operation | Upstream µs | Bridge µs | VPM µs | VPM vs upstream |
|---|---:|---:|---:|---:|
| HS256 sign | 5.21 | 4.07 | 2.44 | -54.7% |
| HS256 verify | 7.01 | 5.39 | 3.26 | -55.4% |
| RS256 sign | 590.09 | 585.82 | 585.95 | -0.8% |
| RS256 verify | 17.95 | 16.17 | 16.26 | -10.5% |
| RS256 verify warm PEM | 22.88 | 21.45 | 16.46 | -29.7% |
| RS256 verify uncached PEM Buffer | 22.45 | 21.22 | 20.97 | -7.0% |
| PS256 sign | 593.34 | 589.90 | 586.84 | -0.9% |
| PS256 verify | 18.91 | 16.80 | 17.01 | -10.1% |
| PS256 verify warm PEM | 22.69 | 21.32 | 16.44 | -27.9% |
| PS256 verify uncached PEM Buffer | 22.88 | 21.33 | 21.86 | -2.6% |
| ES256 sign | 22.64 | 20.39 | 20.25 | -10.6% |
| ES256 verify | 48.65 | 46.96 | 46.35 | -4.1% |
| ES256 verify warm PEM | 50.26 | 48.38 | 46.28 | -7.5% |
| ES256 verify uncached PEM Buffer | 49.77 | 47.91 | 48.38 | -3.0% |
| HS256 sign with claims | 5.93 | 4.42 | 2.67 | -55.2% |
| HS256 verify KeyObject | 3.89 | 2.80 | 2.73 | -28.0% |
| decode complete | 1.37 | 0.76 | 0.67 | -49.9% |
| HS256 sign 64 KiB | 113.09 | 80.38 | 77.11 | -30.8% |
| HS256 verify 64 KiB | 177.15 | 124.39 | 116.98 | -36.0% |
| HS256 verify varying header | 8.21 | 6.90 | 3.99 | -51.0% |
| reject expired | 11.19 | 8.54 | 3.56 | -66.3% |
| reject bad signature | 11.35 | 8.83 | 3.51 | -68.7% |
| HS256 callback sign | 6.88 | 7.46 | 2.78 | -60.4% |
| HS256 callback verify | 8.18 | 6.12 | 2.99 | -62.2% |
| HS256 resolver verify | 7.53 | 5.62 | 3.15 | -56.4% |

## Interpretation and remaining costs

Avoiding failed asymmetric imports drives most HMAC gains. Direct callback
completion also removes the stream setup used by upstream signing. Repeated
public PEM verification benefits from bounded key reuse; applications already
holding native KeyObjects should use those instead of repeatedly importing PEM.

On Node, uncached RSA/EC PEM verification is about 3% slower and uncached RSA-PSS
is 32% slower. The PSS gap is already present in the bridge: `vjwa` reads the
modulus size and rejects shortened signatures that native verification can
accept. VPM retains that check. Warm RSA/PSS PEM verification is about 48% faster,
and KeyObject RSA/PSS verification is approximately unchanged to slightly faster.

Against the bridge, Node HMAC KeyObject verification is 14% slower (about 0.49 µs),
while still taking 10% less time than unmodified upstream. VPM additionally
validates finite claims and verification options and stabilizes audience matching.
Other bridge differences and every sample are retained rather than hidden.

These measurements do not establish application throughput, memory consumption,
startup cost or performance on other CPUs or runtime versions. Correctness tests,
upstream conformance and consumer integration are separate checks.

## Reproduce measurements

Install the pinned consumer fixture first, then run each process sequentially:

```sh
npm --prefix scripts/consumers ci --ignore-scripts --no-audit --no-fund
OUTPUT=/absolute/path/node.json node packages/vjsonwebtoken/bench/compare.cjs
OUTPUT=/absolute/path/bun.json bun packages/vjsonwebtoken/bench/compare.cjs
CALIBRATION=1 OUTPUT=/absolute/path/control.json node packages/vjsonwebtoken/bench/compare.cjs
```

Run three measurement processes and one control for each runtime. The retained
reports are [Node 1](node-1.json), [Node 2](node-2.json), [Node 3](node-3.json),
[Bun 1](bun-1.json), [Bun 2](bun-2.json), [Bun 3](bun-3.json),
[Node control](calibration-node.json) and [Bun control](calibration-bun.json).
