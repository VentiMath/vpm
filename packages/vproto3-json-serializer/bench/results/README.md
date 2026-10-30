# vproto3-json-serializer measurements

Recorded October 30, 2026 on Apple M1 Pro (darwin arm64), Node 24.22.1 and
Bun 1.4.0, against **proto3-json-serializer 4.1.0**.

Three fresh processes per runtime, twelve alternating paired rounds, 150 ms
warmup per variant and four full warmup blocks. Each case calibrates to a 15 ms
upstream pilot, capped at 100,000 operations. Outputs are retained and checked
outside timing. One additional process compares upstream with itself. Raw samples,
runtime versions, source and fixture hashes are retained; no samples are trimmed.
Positive percentages mean VPM takes more time.

Direct conversion cases give both serializers the **same vprotobufjs 8.8.1 types**.
The last two rows drive actual google-gax 6.14.0 fallback code with Firestore 9.4.0
schemas: original serializer/protobuf 7.6.6 versus VPM serializer/vprotobufjs 8.8.1.
Those are stack comparisons; their gains cannot be attributed to this serializer
alone. These are local CPU measurements, not cloud RPC or application throughput.

## Findings

Actual gax/Firestore request construction takes **11% less time on Node and 17%
less on Bun**; response decoding takes **28% / 18% less**. These include the
protobuf runtime change described above. Direct Google-shaped serialization
uses **22% / 49% less time** with identical protobuf types. Repeated/map integer
conversion improves in both directions on both runtimes.

Remaining costs and measurement limits:

- Validating and decoding a **1 KiB byte field** adds about **197 ns / 49% on Node**
  and **482 ns / 103% on Bun**. Canonical larger inputs use native decode and
  re-encode equality to validate them; other accepted encodings use the complete
  grammar. Upstream decodes permissively without equivalent validation. This cost
  remains after optimizing the original full-string validation scan.
- Bun Timestamp parsing adds about **58 ns / 31%**, with three processes ranging
  from 19% to 47%. The converter validates calendar dates, offsets and ranges and
  preserves fractional nanoseconds. Node's same case takes 32% less time.
- Bun's Google-shaped input conversion is effectively unchanged by paired ratios,
  despite lower pooled absolute medians. The paired change is smaller than its
  identical-code control; it does not support a speedup claim.
- Bun byte output varies from 17% faster to 10% slower across processes. Its pooled
  gain is not a consistent improvement. The Bun response-decoding control varies
  by 6.5%, below but material relative to the measured 16–19% per-process gain.
  Raw samples and controls are retained rather than selecting favorable runs.

Nanoseconds are pooled medians. Changes are medians of paired per-round ratios,
so they need not equal the ratio of pooled medians. Process columns list each
fresh process's paired-ratio median; controls measure order/JIT/timing variation.

## Node

| Case | Upstream ns | VPM ns | Change | Three processes | Identical-code control |
| --- | ---: | ---: | ---: | --- | ---: |
| 1 KiB bytes / to JSON | 325 | 268 | -18.5% | -21.6%, -18.8%, -16.2% | -0.9% |
| 1 KiB bytes / from JSON | 394 | 591 | +49.0% | +49.4%, +49.2%, +46.7% | +2.2% |
| small scalars / to JSON | 197 | 177 | -10.9% | -18.5%, -10.9%, -7.1% | +0.7% |
| small scalars / from JSON | 280 | 237 | -15.5% | -15.5%, -17.6%, -15.0% | +0.2% |
| Google-shaped values / to JSON | 1540 | 1189 | -22.3% | -20.4%, -23.8%, -21.7% | -0.8% |
| Google-shaped values / from JSON | 1448 | 1341 | -6.1% | -5.1%, -10.3%, -4.9% | -1.6% |
| repeated and map integers / to JSON | 436 | 229 | -47.5% | -46.7%, -49.0%, -46.7% | +0.1% |
| repeated and map integers / from JSON | 740 | 521 | -29.2% | -27.0%, -30.4%, -29.0% | +1.1% |
| Timestamp / to JSON | 860 | 694 | -19.3% | -17.1%, -19.6%, -19.3% | -0.0% |
| Timestamp / from JSON | 552 | 378 | -32.4% | -33.6%, -31.4%, -30.5% | -0.9% |
| Duration / to JSON | 358 | 149 | -58.8% | -58.7%, -59.8%, -57.8% | -0.3% |
| Duration / from JSON | 393 | 192 | -50.5% | -47.5%, -51.2%, -51.7% | -0.2% |
| Struct / to JSON | 448 | 387 | -14.0% | -13.4%, -15.5%, -13.8% | +1.0% |
| Struct / from JSON | 1096 | 870 | -19.8% | -20.8%, -19.6%, -18.5% | -0.4% |
| numeric enum / to JSON | 170 | 111 | -35.3% | -34.3%, -36.6%, -35.4% | -0.8% |
| gax Firestore / encode request | 7629 | 6861 | -11.1% | -11.7%, -12.4%, -9.1% | -2.7% |
| gax Firestore / decode response | 14332 | 10295 | -28.1% | -28.8%, -27.8%, -28.5% | -1.9% |

## Bun

| Case | Upstream ns | VPM ns | Change | Three processes | Identical-code control |
| --- | ---: | ---: | ---: | --- | ---: |
| 1 KiB bytes / to JSON | 280 | 253 | -11.5% | -16.6%, +9.7%, -14.8% | -2.2% |
| 1 KiB bytes / from JSON | 418 | 900 | +102.5% | +85.0%, +110.7%, +102.5% | +8.3% |
| small scalars / to JSON | 187 | 61 | -67.0% | -66.9%, -66.5%, -67.6% | -2.0% |
| small scalars / from JSON | 243 | 126 | -49.3% | -50.0%, -48.5%, -38.4% | -1.5% |
| Google-shaped values / to JSON | 1252 | 621 | -48.5% | -46.0%, -50.4%, -50.4% | -2.3% |
| Google-shaped values / from JSON | 1208 | 1026 | -0.6% | -0.2%, -8.9%, +1.3% | -4.1% |
| repeated and map integers / to JSON | 525 | 133 | -75.2% | -74.9%, -76.9%, -75.3% | +2.8% |
| repeated and map integers / from JSON | 721 | 448 | -37.5% | -38.4%, -32.7%, -40.3% | +2.1% |
| Timestamp / to JSON | 386 | 264 | -31.7% | -29.9%, -31.8%, -31.8% | -0.0% |
| Timestamp / from JSON | 221 | 279 | +30.5% | +30.5%, +47.1%, +19.4% | -0.1% |
| Duration / to JSON | 183 | 115 | -39.6% | -35.1%, -39.8%, -40.9% | -2.1% |
| Duration / from JSON | 179 | 132 | -24.4% | -24.1%, -27.0%, -23.8% | +3.2% |
| Struct / to JSON | 346 | 135 | -60.9% | -60.8%, -60.1%, -63.2% | -3.3% |
| Struct / from JSON | 703 | 426 | -40.1% | -43.5%, -37.3%, -45.3% | -1.0% |
| numeric enum / to JSON | 194 | 78 | -60.5% | -59.6%, -60.3%, -61.3% | +0.9% |
| gax Firestore / encode request | 5669 | 4769 | -17.1% | -17.1%, -13.9%, -21.1% | +1.2% |
| gax Firestore / decode response | 8636 | 7050 | -17.8% | -18.5%, -15.8%, -16.8% | -6.5% |

## Reproduce

```sh
npm --prefix scripts/protojson-conformance ci --ignore-scripts --no-audit --no-fund
OUTPUT=packages/vproto3-json-serializer/bench/results/node-1.json node packages/vproto3-json-serializer/bench/compare.cjs
CALIBRATION=1 OUTPUT=packages/vproto3-json-serializer/bench/results/node-control.json node packages/vproto3-json-serializer/bench/compare.cjs
```

Repeat ordinary runs in three fresh processes and use `bun` for the other runtime.
Run serially without concurrent tests. Verify the retained reports and current hashes:

```sh
node -e "require('./scripts/bench-paired.cjs').summarize(require('node:path').resolve('packages/vproto3-json-serializer'))" -- --verify-current
```
