# vprotobufjs measurements

Recorded October 30, 2026 on Apple M1 Pro (darwin arm64), Node 24.22.1 and
Bun 1.4.0, against **protobuf.js 8.8.1** with its original long dependency.

Three fresh processes per runtime, twelve alternating paired rounds, 150 ms
warmup per variant and four full warmup blocks. Each case calibrates to a 15 ms
upstream pilot, capped at 100,000 operations. Outputs are retained and checked
outside timing. One additional process compares upstream with itself. Raw samples,
runtime versions, source and fixture hashes are retained; no samples are trimmed.
Positive percentages mean VPM takes more time.

## Findings

The Google-shaped conversion workload takes **11% less time to convert/encode
and 32% less to decode/convert on Node**, and **10% / 25% less on Bun**.
Actual gRPC proto-loader serialization takes **10% less on Node / 7% less on Bun**;
deserialization takes **35% / 21% less**. Faster vlong string conversion contributes
to these results. Already-constructed messages do not receive that conversion gain.

Remaining costs and measurement limits:

- Node small-message encoding adds about **8–18 ns** (5–10%); decoding adds about
  **3–5 ns** (3–5%). Packed-message decoding is effectively unchanged.
- The short packed uint32 reader adds about **12 ns / 30% on Node**. It restores
  its temporary length even when a read or array append throws. Bun's same case
  takes 24% less time; that runtime difference does not erase the Node cost.
- Malformed nested decoding adds about **302 ns / 6% on Node** and **127 ns / 19%
  on Bun**, while restoring reader bounds before rethrowing.
- Firestore's generated Document encoding is **6% slower on Node**. Bun's pooled
  paired ratio is **22% slower**, but its processes vary from 2% to 24% slower;
  pooled absolute medians are almost equal because timing distributions vary.
  The full samples and paired ratios are retained rather than selecting a more
  favorable statistic. Document decoding is effectively unchanged on each runtime.
- Several Bun small-message controls differ by 7–30% even with identical code.
  Those cases do not support reliable speed claims. Google-style conversion and
  gRPC deserialization gains are larger and consistent across the three processes;
  their controls vary by at most 3.1%.

These are local CPU measurements, not cloud RPC or end-to-end application throughput.
The baseline is version 8, not the older protobuf 7 still pinned by the SDKs.
Caller correctness against selected 7.6.6 paths is checked separately.

Nanoseconds are pooled medians. Changes are medians of paired per-round ratios,
so they need not equal the ratio of pooled medians. Process columns list each
fresh process's paired-ratio median; controls measure order/JIT/timing variation.

## Node

| Case | Upstream ns | VPM ns | Change | Three processes | Identical-code control |
| --- | ---: | ---: | ---: | --- | ---: |
| small numeric message / encode | 134 | 142 | +5.2% | +5.2%, +5.5%, +5.0% | -0.6% |
| small numeric message / decode | 77 | 81 | +4.7% | +2.9%, +5.5%, +5.2% | +0.6% |
| packed numeric message / encode | 513 | 492 | -3.4% | -3.6%, -4.7%, -3.2% | +0.4% |
| packed numeric message / decode | 609 | 614 | +0.5% | +0.1%, +1.8%, +0.9% | +1.5% |
| nested message / encode | 176 | 186 | +5.8% | +5.8%, +5.1%, +6.5% | +0.9% |
| nested message / decode | 87 | 90 | +2.9% | +2.5%, +1.0%, +4.6% | -0.2% |
| 64-bit message / encode | 187 | 205 | +9.6% | +11.4%, +10.1%, +7.1% | -0.2% |
| 64-bit message / decode | 87 | 92 | +4.9% | +4.4%, +4.9%, +5.5% | +0.3% |
| fromObject + encode / Google-shaped values | 1016 | 905 | -10.8% | -10.2%, -9.4%, -12.0% | -1.2% |
| decode + toObject / Google-shaped values | 1391 | 940 | -32.2% | -31.7%, -32.6%, -33.0% | -0.2% |
| packed uint32 reader | 43 | 55 | +29.5% | +30.6%, +25.9%, +30.3% | +1.6% |
| malformed nested decode | 5445 | 5747 | +5.5% | +5.9%, +5.1%, +6.7% | -0.1% |
| gRPC loader / serialize | 1209 | 1096 | -9.7% | -9.7%, -10.5%, -8.4% | -1.3% |
| gRPC loader / deserialize | 1234 | 801 | -35.2% | -35.5%, -32.9%, -35.5% | +0.2% |
| Firestore generated Document / encode | 895 | 943 | +5.9% | +7.3%, +3.8%, +5.4% | -1.2% |
| Firestore generated Document / decode | 848 | 858 | +1.4% | +1.4%, +1.3%, +1.9% | +0.7% |

## Bun

| Case | Upstream ns | VPM ns | Change | Three processes | Identical-code control |
| --- | ---: | ---: | ---: | --- | ---: |
| small numeric message / encode | 214 | 187 | -9.8% | -4.4%, -8.3%, -28.7% | +22.8% |
| small numeric message / decode | 59 | 61 | +7.1% | +7.1%, +6.6%, +3.4% | -30.1% |
| packed numeric message / encode | 741 | 777 | +3.4% | +10.5%, +1.2%, -0.0% | +7.4% |
| packed numeric message / decode | 1075 | 1001 | -5.5% | -6.8%, -5.4%, -3.3% | +0.9% |
| nested message / encode | 270 | 251 | -5.4% | -0.1%, +18.3%, -12.4% | -10.0% |
| nested message / decode | 78 | 78 | -0.7% | -0.7%, -0.7%, -0.4% | +0.3% |
| 64-bit message / encode | 267 | 273 | +2.5% | -10.4%, +7.9%, +3.9% | -9.8% |
| 64-bit message / decode | 90 | 94 | +3.0% | +5.3%, +2.8%, +3.0% | -10.8% |
| fromObject + encode / Google-shaped values | 683 | 596 | -10.3% | -9.7%, -12.4%, -17.8% | -3.0% |
| decode + toObject / Google-shaped values | 885 | 659 | -25.1% | -27.5%, -22.5%, -19.6% | -1.1% |
| packed uint32 reader | 50 | 38 | -24.2% | -10.4%, -26.1%, -24.2% | -2.3% |
| malformed nested decode | 648 | 775 | +19.2% | +20.8%, +23.5%, +16.6% | +1.1% |
| gRPC loader / serialize | 690 | 647 | -7.2% | -9.3%, -4.7%, -7.9% | +3.1% |
| gRPC loader / deserialize | 811 | 642 | -20.6% | -19.0%, -22.3%, -20.9% | +2.6% |
| Firestore generated Document / encode | 661 | 664 | +21.8% | +15.8%, +2.0%, +23.7% | -6.8% |
| Firestore generated Document / decode | 553 | 546 | +0.1% | -1.5%, +2.7%, -1.7% | -2.0% |

## Reproduce

```sh
npm --prefix scripts/protobuf-conformance ci --ignore-scripts --no-audit --no-fund
OUTPUT=packages/vprotobufjs/bench/results/node-1.json node packages/vprotobufjs/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vprotobufjs/bench/results/node-control.json node packages/vprotobufjs/bench/compare.cjs
```

Repeat ordinary runs in three fresh processes and use `bun` for the other runtime.
Run serially without concurrent tests. Verify the retained reports and current hashes:

```sh
node -e "require('./scripts/bench-paired.cjs').summarize(require('node:path').resolve('packages/vprotobufjs'))" -- --verify-current
```
