# vjws performance follow-up

Node 24.22.1 and Bun 1.4.0 on Apple M1 Pro, macOS arm64. The three measured variants
are upstream `jws` 4.0.1 + `jwa` 2.0.1, VPM at `adc9cb4` (before), and the current
VPM implementation. The retained before files exactly match that commit. Both
VPM variants use the same unchanged `vjwa`, so this comparison isolates the JWS
changes. The [initial results](../README.md) separately measured upstream JWS with
`vjwa` underneath to identify inherited crypto costs.

## What changed

Source streams now use owned data/end/error/close listeners and a shared input
state, avoiding an intermediary Writable and pipe lifecycle. Public/manual inputs
remain native Writables, created on demand. Copying caller-owned chunks, per-input
limits, cancellation, premature-close rejection, queued-error handling and native
readable output remain covered. Cancellation detaches only the operation's own
listeners and preserves another reader of the same source.

Large payload validation reuses one lazy 64 KiB scratch buffer and clears it in
`finally` after each block. Node's decoder permits a faster exact-byte-count check
when the alphabet aliases, wide characters, length and unused tail bits have
already been checked. With a valid encoded length (not 1 modulo 4), ignoring even
one character necessarily reduces the decoded byte count. The allowed alphabet
has no other aliases after those exclusions. Bun needs an exact round trip:
its Buffer.write decoder can consume invalid ASCII such as `[` as base64 values.
The two paths are tested against a canonical round-trip oracle across all byte
values, Unicode aliases, surrogates, length thresholds and scratch-block edges.

Header parsing no longer creates an extra frozen header object. Its
private cached values are serialized JSON and the algorithm string; decoded
objects stay independent. UTF-8 decoding is checked natively when a replacement
character appears, distinguishing valid U+FFFD from malformed input. The large
payload helper is kept outside the common small-token parsing function.

## Method and interpretation

The [harness](../../followup.cjs) runs 12 measured rounds using all six variant
orders twice. Each workload has 128 sync/two async initial calls and five full
warmup blocks per variant in changing order. A pilot targets 10 ms blocks. Three
fresh processes per runtime and one identical-upstream control are retained.
Every workload validates outputs before timing; results are retained and consumed;
no samples are trimmed. All runs execute sequentially.

Tables show pooled median microseconds and the median of 36 within-round elapsed
time ratios. Those paired changes need not equal ratios of the displayed medians.
Negative means less time. Controls measure identical upstream implementations;
they are noise indicators, not corrections. Node controls span -4.7% to +1.5%,
Bun controls -5.2% to +13.4%. The source hashes, raw samples and per-process summaries
make the variability visible. In particular, unchanged Bun signing measured a
+10.8% paired difference against before despite similar pooled medians; these
runs do not establish a signing improvement. One Node uncached-PSS process was
also substantially noisier than the others. All of those samples are retained.

KeyObject cases exclude import. String PEM verification uses a warm public-key
cache, while PEM Buffer verification includes uncached imports. Varying signing
headers use new key IDs; varying verification rotates 257 headers, exceeding the
bounded caches. Large payloads are ASCII so upstream and VPM handle identical
bytes. Stream timing includes source creation, collection and signing.

## Node 24.22.1

| Workload | Upstream µs | Before µs | Current µs | vs upstream | vs before | Control |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| HS256 sign | 3.573 | 2.532 | 2.455 | -31.1% | -2.3% | +0.9% |
| HS256 verify | 2.878 | 2.540 | 2.481 | -13.2% | -2.4% | -0.3% |
| RS256 sign | 679.421 | 680.566 | 689.793 | +1.0% | +1.2% | +1.5% |
| RS256 verify | 22.687 | 23.017 | 22.844 | +0.3% | -0.6% | -0.1% |
| RS256 verify warm PEM | 44.755 | 22.761 | 22.953 | -48.7% | +1.1% | +0.6% |
| RS256 verify uncached PEM Buffer | 43.841 | 46.885 | 47.205 | +7.7% | +0.4% | -0.5% |
| PS256 sign | 699.530 | 684.840 | 680.076 | -2.0% | -0.4% | -1.7% |
| PS256 verify | 24.037 | 23.989 | 24.132 | +0.1% | +0.2% | +0.8% |
| PS256 verify warm PEM | 46.893 | 23.689 | 23.723 | -49.6% | +0.2% | +0.8% |
| PS256 verify uncached PEM Buffer | 46.907 | 65.119 | 66.379 | +40.4% | +1.1% | +0.2% |
| ES256 sign | 33.531 | 30.912 | 29.884 | -5.6% | +0.4% | -4.7% |
| ES256 verify | 74.467 | 76.061 | 75.280 | +0.9% | -0.2% | +0.0% |
| ES256 verify warm PEM | 89.709 | 72.481 | 73.290 | -19.1% | +1.3% | -0.1% |
| ES256 verify uncached PEM Buffer | 88.771 | 95.002 | 96.292 | +7.3% | +1.0% | -0.3% |
| decode JWT | 1.844 | 1.109 | 1.114 | -39.4% | +0.3% | -0.6% |
| isValid JWT | 0.648 | 0.356 | 0.359 | -44.7% | +0.6% | +0.3% |
| HS256 sign 64 KiB | 87.627 | 78.776 | 79.818 | -9.4% | +2.2% | -1.0% |
| HS256 verify 64 KiB | 58.139 | 76.843 | 69.227 | +18.2% | -10.0% | +0.4% |
| decode 64 KiB | 102.952 | 43.221 | 35.013 | -66.2% | -15.6% | -0.5% |
| HS256 sign varying header | 3.630 | 3.375 | 3.426 | -5.0% | +3.0% | +1.1% |
| HS256 verify varying header | 2.813 | 3.169 | 3.077 | +8.7% | -3.5% | +1.1% |
| stream sign one chunk | 10.005 | 11.643 | 7.800 | -21.9% | -31.6% | +1.0% |
| stream sign 256 KiB / 16 chunks | 838.300 | 385.991 | 364.533 | -55.3% | -4.8% | -2.1% |
| stream sign 256 KiB / 1024 chunks | 11910.938 | 1649.479 | 1205.521 | -90.1% | -32.6% | -4.4% |

## Bun 1.4.0

| Workload | Upstream µs | Before µs | Current µs | vs upstream | vs before | Control |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| HS256 sign | 3.082 | 1.476 | 1.505 | -51.5% | +10.8% | +4.1% |
| HS256 verify | 2.461 | 1.694 | 1.699 | -25.6% | -1.9% | -0.8% |
| RS256 sign | 720.747 | 714.155 | 719.978 | -0.5% | +0.5% | +0.6% |
| RS256 verify | 17.487 | 16.722 | 16.816 | -4.5% | +0.3% | -2.1% |
| RS256 verify warm PEM | 22.151 | 16.698 | 16.557 | -25.3% | -0.7% | -1.8% |
| RS256 verify uncached PEM Buffer | 22.251 | 22.250 | 22.141 | -0.2% | -0.6% | -1.3% |
| PS256 sign | 717.590 | 710.710 | 710.076 | -1.1% | -0.3% | -0.4% |
| PS256 verify | 17.961 | 17.239 | 17.078 | -4.6% | -1.3% | +4.0% |
| PS256 verify warm PEM | 23.441 | 17.506 | 17.478 | -26.8% | -0.2% | -1.5% |
| PS256 verify uncached PEM Buffer | 23.272 | 23.040 | 23.000 | -1.3% | +0.5% | +1.5% |
| ES256 sign | 25.560 | 22.290 | 22.402 | -12.9% | +0.7% | -0.7% |
| ES256 verify | 54.543 | 53.749 | 54.166 | -0.2% | +0.7% | -1.1% |
| ES256 verify warm PEM | 55.859 | 53.421 | 53.936 | -4.0% | +1.2% | +0.6% |
| ES256 verify uncached PEM Buffer | 55.574 | 55.454 | 55.603 | -0.1% | +0.3% | +0.3% |
| decode JWT | 1.680 | 0.746 | 0.828 | -52.2% | +1.7% | +7.8% |
| isValid JWT | 0.572 | 0.269 | 0.266 | -52.2% | -0.2% | +1.3% |
| HS256 sign 64 KiB | 117.164 | 75.030 | 74.999 | -36.7% | -3.0% | +2.0% |
| HS256 verify 64 KiB | 75.781 | 95.096 | 90.727 | +20.1% | -3.8% | -2.3% |
| decode 64 KiB | 123.352 | 48.279 | 44.672 | -63.3% | -1.5% | +3.9% |
| HS256 sign varying header | 3.221 | 2.153 | 2.141 | -34.2% | -1.2% | +5.3% |
| HS256 verify varying header | 2.323 | 2.472 | 2.286 | -2.3% | -8.9% | -5.2% |
| stream sign one chunk | 6.805 | 14.208 | 7.381 | +5.2% | -35.0% | +2.2% |
| stream sign 256 KiB / 16 chunks | 724.847 | 292.061 | 321.786 | -58.5% | +2.9% | -2.5% |
| stream sign 256 KiB / 1024 chunks | 8474.573 | 475.146 | 424.334 | -95.1% | -9.1% | +13.4% |

## Outcomes and remaining costs

- One-chunk signing uses about 32% less time than before on Node and 35% less on
  Bun. Against upstream it is 22% faster on Node and still about 5% slower on Bun,
  reduced from the initial 12%/51% regressions. Standard readable output and robust
  cleanup remain; this is not a claim that every stream workload is faster.
- 64 KiB verification uses about 10% less time than before on Node. Bun's smaller
  paired reduction is about 4% and varies across runs. Against upstream, the
  remaining gaps are about 18% on Node and 20% on Bun (roughly 11 and 15 µs).
  Canonical input validation still performs work upstream verification omits.
- Varying-header verification has a small Node improvement and remains about 9%
  slower than upstream (0.26 µs). Bun is approximately level with upstream across
  the process variation. Repeated-header verification retains its earlier gains.
- Many-chunk collection remains substantially faster than upstream. The new
  before/after reductions are about 33% on Node and 9% on Bun for 1,024 chunks;
  the Bun control is noisy, so do not treat that smaller improvement as precise.
- Uncached Node RSA/EC PEM verification still costs about 7–8% more, and RSA-PSS
  about 40% more. Those are inherited `vjwa` key-import/validation costs. This
  change does not weaken key-family/curve checks or the exact PSS signature-length
  requirement. Reused KeyObjects and warm PEM paths avoid repeated imports, as
  their separate rows show.

These are package benchmarks, not deployed throughput, startup or memory measurements.

## Reproduction

Run three fresh processes per runtime, using `node-1` through `node-3` and
`bun-1` through `bun-3` output names, followed by one control for each. Run them
sequentially without CPU-heavy tests in parallel.

```sh
OUTPUT=packages/vjws/bench/results/followup/node-1.json node packages/vjws/bench/followup.cjs
OUTPUT=packages/vjws/bench/results/followup/bun-1.json bun packages/vjws/bench/followup.cjs
CALIBRATION=1 OUTPUT=packages/vjws/bench/results/followup/calibration-node.json node packages/vjws/bench/followup.cjs
CALIBRATION=1 OUTPUT=packages/vjws/bench/results/followup/calibration-bun.json bun packages/vjws/bench/followup.cjs
node packages/vjws/bench/summarize-followup.cjs --verify-current
```

The summary validates matching source hashes, runtime metadata, sample counts and
positive finite samples, then prints medians, paired changes, per-process changes
and controls. The before fixtures remain excluded from installable archives.
