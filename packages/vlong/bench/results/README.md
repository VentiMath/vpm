# vlong measurements

Recorded October 30, 2026 on Apple M1 Pro (darwin arm64),
Node 24.22.1 and Bun 1.4.0, against long 5.3.2.

Three fresh processes per runtime, twelve alternating paired rounds after
150 ms of warmup per variant and four full warmup blocks. Each case calibrates
to a 15 ms upstream pilot, capped at 100,000 operations. Results are retained
and checked outside timing. One additional process compares upstream with itself.
All raw samples, runtime versions and source/fixture hashes are retained here.
No samples are trimmed. Positive percentages mean VPM takes more time.

## Findings

On Node, protobuf 8/7 conversion plus encoding takes **36.2% / 28.2% less time**;
decoding plus conversion to ordinary objects takes **65.5% / 63.7% less**.
Bun decoding takes **34.7% / 37.1% less**. These use the actual protobuf modules
and exact signed/unsigned 64-bit values, arrays, map keys and a timestamp.
They are local conversion/serialization measurements, not RPC throughput.

Decimal parsing takes 52–62% less time on Node and 6–30% less on Bun. Tested
formatting cases take 81–91% less on Node and 45–70% less on Bun.

Remaining costs and uncertainty are explicit:

- Node's independent small integer construction takes about **3–4 ns more**
  (22–32%): each call now allocates a mutable value instead of sharing a cache.
- Checked ordinary byte arrays take about **3 ns more** on each runtime
  (17–19%). Indexed values are read once, validated, then assembled; custom
  iterators cannot bypass validation. Typed byte arrays avoid element checks.
- Bun's signed construction varies from 17% slower to 11% faster; its aggregate
  does not establish a reliable improvement.
- Bun encoding gains are modest: 8% for protobuf 8 and 14% for protobuf 7. The
  protobuf 7 identical-code control differs by **12.4%**, nearly as much as the
  measured gain, so that encoding result is inconclusive. Small arithmetic and
  typed-array differences also warrant less weight than the conversion gains.

Nanoseconds below are pooled medians; change percentages are medians of the
paired ratios, so they need not equal the ratio of rounded pooled medians.
Process values give each fresh process's paired-ratio median. Controls measure
order/JIT/timing variation, not another package.

## Node

| Case | Upstream ns | VPM ns | Change | Three processes | Identical-code control |
| --- | ---: | ---: | ---: | --- | ---: |
| small signed construction | 14 | 17 | +21.6% | +20.9%, +23.9%, +22.3% | +1.6% |
| small unsigned construction | 10 | 14 | +31.6% | +32.4%, +25.6%, +35.8% | -0.3% |
| short decimal parse | 87 | 42 | -52.4% | -51.2%, -51.5%, -54.7% | +0.6% |
| signed int64 decimal parse | 343 | 132 | -60.9% | -61.0%, -60.4%, -62.5% | -0.7% |
| unsigned int64 decimal parse | 304 | 118 | -61.5% | -62.1%, -60.5%, -61.4% | +0.5% |
| hexadecimal parse | 202 | 128 | -35.9% | -35.3%, -36.1%, -39.4% | +0.1% |
| base36 parse | 222 | 108 | -50.9% | -51.9%, -50.1%, -50.9% | -1.6% |
| short decimal format | 105 | 15 | -86.3% | -86.3%, -86.9%, -86.1% | +1.1% |
| signed int64 decimal format | 605 | 56 | -90.7% | -90.5%, -91.0%, -90.7% | -1.8% |
| unsigned int64 decimal format | 540 | 71 | -87.0% | -87.2%, -87.2%, -86.6% | -0.5% |
| hexadecimal format | 402 | 78 | -80.9% | -80.6%, -80.7%, -81.1% | -1.1% |
| multiply | 36 | 25 | -31.2% | -32.3%, -31.2%, -29.6% | +0.8% |
| divide | 43 | 33 | -22.3% | -22.3%, -22.0%, -23.8% | +1.4% |
| eight array bytes | 17 | 20 | +16.8% | +19.2%, +9.2%, +25.6% | -3.2% |
| eight Uint8Array bytes | 22 | 20 | -7.7% | -6.5%, -7.7%, -12.3% | +5.7% |
| protobuf 8 fromObject + encode | 4782 | 3045 | -36.2% | -35.5%, -36.8%, -35.5% | -1.5% |
| protobuf 8 decode + toObject | 6275 | 2160 | -65.5% | -65.6%, -65.1%, -65.8% | +0.8% |
| protobuf 7 fromObject + encode | 6522 | 4620 | -28.2% | -28.4%, -28.1%, -29.2% | -0.6% |
| protobuf 7 decode + toObject | 5662 | 2037 | -63.7% | -63.5%, -64.2%, -63.6% | -1.1% |

## Bun

| Case | Upstream ns | VPM ns | Change | Three processes | Identical-code control |
| --- | ---: | ---: | ---: | --- | ---: |
| small signed construction | 10 | 10 | -4.5% | +17.3%, -10.7%, -9.6% | -0.6% |
| small unsigned construction | 12 | 4 | -70.9% | -71.8%, -70.0%, -70.8% | +0.2% |
| short decimal parse | 60 | 42 | -29.7% | -28.6%, -29.2%, -30.3% | -0.8% |
| signed int64 decimal parse | 167 | 137 | -17.2% | -14.8%, -20.5%, -18.0% | -1.7% |
| unsigned int64 decimal parse | 146 | 142 | -5.6% | -0.4%, -7.0%, -8.6% | -0.1% |
| hexadecimal parse | 113 | 99 | -13.7% | -10.6%, -17.7%, -17.1% | +0.8% |
| base36 parse | 121 | 77 | -36.1% | -34.9%, -38.5%, -38.8% | +3.5% |
| short decimal format | 65 | 21 | -69.6% | -71.3%, -68.6%, -68.9% | -0.8% |
| signed int64 decimal format | 301 | 132 | -53.4% | -53.8%, -52.9%, -53.4% | -0.5% |
| unsigned int64 decimal format | 242 | 130 | -45.4% | -45.0%, -47.2%, -43.7% | +0.7% |
| hexadecimal format | 236 | 75 | -68.9% | -65.5%, -68.5%, -71.4% | -1.5% |
| multiply | 24 | 24 | -2.8% | -9.8%, -2.0%, -0.3% | -1.4% |
| divide | 29 | 25 | -12.8% | -12.4%, -13.3%, -12.3% | -3.6% |
| eight array bytes | 19 | 22 | +19.1% | +16.5%, +24.8%, +23.5% | +3.2% |
| eight Uint8Array bytes | 20 | 19 | -11.9% | -15.1%, -11.2%, -11.6% | +0.1% |
| protobuf 8 fromObject + encode | 2537 | 2274 | -8.0% | -5.1%, -10.0%, -7.8% | -4.4% |
| protobuf 8 decode + toObject | 2920 | 1936 | -34.7% | -32.0%, -38.6%, -32.7% | -0.0% |
| protobuf 7 fromObject + encode | 2549 | 2228 | -13.8% | -14.0%, -13.8%, -19.5% | -12.4% |
| protobuf 7 decode + toObject | 2751 | 1743 | -37.1% | -36.3%, -31.3%, -38.8% | +0.9% |

## Reproduce

Install the pinned [comparison fixture](../../../../scripts/long-conformance/README.md),
then from the repository root:

```sh
for runtime in node bun; do
  for run in 1 2 3; do
    OUTPUT="packages/vlong/bench/results/$runtime-$run.json" "$runtime" packages/vlong/bench/compare.cjs
  done
  CALIBRATION=1 OUTPUT="packages/vlong/bench/results/$runtime-control.json" "$runtime" packages/vlong/bench/compare.cjs
done
node -e "require('./scripts/bench-paired.cjs').summarize(require('node:path').resolve('packages/vlong'))" -- --verify-current
```

Run serially without other CPU-heavy checks. No cloud calls or credentials are
used. The input corpus is intentionally fixed; different message shapes, engines
and machines can change these results. No overall application speedup is claimed.
