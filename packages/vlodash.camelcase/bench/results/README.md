# vlodash.camelcase benchmark evidence

Measured October 30, 2026 on Apple M1 Pro / macOS arm64, using Node 24.22.1
and Bun 1.4.0 against lodash.camelcase 4.3.0. Negative paired changes mean less
elapsed time. These are local measurements, not application latency predictions.

## Method

[compare.cjs](../compare.cjs) uses the shared paired runner: three fresh processes
per runtime, 150 ms of warmup per variant, four full warmup blocks, then twelve
alternating paired rounds. An upstream pilot targets 15 ms per block, capped at
100,000 operations. Results are retained and validated outside timing. No samples
are trimmed. One additional process runs upstream against itself as a noise control.
The JSON reports retain every sample, runtime metadata and source hashes.

Caller cases use installed `@grpc/proto-loader` 0.8.1, google-gax 6.14.0 and the
Firestore 9.4.0 v1 schema. Each case shares one compiled caller, switching only the
camel-case function through the same forwarding function. This avoids attributing
different caller compilation histories to the replacement. gax loads are forced
to bypass its schema cache. These callers use upstream protobuf dependencies;
the separate correctness suite also checks the VPM protobuf stack.

Times below are pooled median nanoseconds per operation. Changes are medians of
paired ratios, so they need not equal the ratio of the displayed time medians.

## Utility conversion

| Input | Node upstream → VPM, ns | Node paired change | Bun upstream → VPM, ns | Bun paired change |
| --- | ---: | ---: | ---: | ---: |
| Short PascalCase RPC | 284 → 49 | −82.8% | 282 → 37 | −87.1% |
| Already camelCase | 376 → 34 | −91.3% | 398 → 24 | −93.8% |
| Acronyms | 370 → 238 | −36.0% | 444 → 326 | −26.6% |
| Digits and underscores | 537 → 352 | −34.2% | 627 → 445 | −29.0% |
| Latin accents | 718 → 630 | −11.9% | 719 → 675 | −6.7% |
| Greek and CJK | 617 → 560 | −9.3% | 940 → 875 | −7.0% |
| Joined emoji | 976 → 719 | −26.0% | 1,225 → 922 | −24.2% |
| Long ASCII, about 4 KiB | 63,359 → 45,981 | −27.4% | 112,536 → 98,622 | −9.9% |
| Long mixed Unicode | 65,347 → 50,081 | −24.2% | 105,238 → 81,386 | −21.5% |
| Batch of 13 mixed RPC names | 4,732 → 1,815 | −61.6% | 6,265 → 2,776 | −57.7% |

Simple RPC names show consistent large gains across the three processes. The
Bun long-ASCII result is less certain: process changes range from −22.7% to −1.8%,
and the identical-upstream control moves +9.1%. The benchmark covers string
identifiers, not every supported object-coercion path.

## Actual callers

| Operation | Node upstream → VPM, ns | Node paired change | Bun upstream → VPM, ns | Bun paired change |
| --- | ---: | ---: | ---: | ---: |
| gRPC loader, 13 methods | 64,104 → 59,315 | −7.3% | 48,971 → 45,063 | −6.6% |
| gRPC loader, full Firestore schema | 5,107,465 → 5,111,250 | −0.7% | 3,991,761 → 3,847,729 | −4.7% |
| gax forced proto load, 13 methods | 108,354 → 103,122 | −3.6% | 80,185 → 72,457 | −6.8% |

The small loader case improves about 7% on both runtimes. Full Firestore loading
is inconclusive: process changes span −5.9% to +4.6% on Node and −10.6% to +1.0%
on Bun, while controls move +5.1% and +8.1%. Protobuf construction dominates this
operation. Node's gax result is also inconclusive, with a −14.2% control movement
and process changes crossing zero. Bun's gax processes all improve (−10.2% to
−3.0%), but the control moves −3.4%; treat the aggregate as a modest local result.
No overall Firebase or application speedup is established here.

## Reproduce

Install the two comparison fixtures as described in the
[package README](../../README.md), then run from the repository root:

```sh
node packages/vlodash.camelcase/bench/compare.cjs > /tmp/camel-node.json
bun packages/vlodash.camelcase/bench/compare.cjs > /tmp/camel-bun.json
CALIBRATION=1 node packages/vlodash.camelcase/bench/compare.cjs > /tmp/camel-node-control.json
CALIBRATION=1 bun packages/vlodash.camelcase/bench/compare.cjs > /tmp/camel-bun-control.json
node packages/vlodash.camelcase/bench/summarize.cjs
```

Repeat measurement commands in fresh processes without concurrent CPU-heavy work.
The summary reads the committed `node-{1,2,3,control}.json` and
`bun-{1,2,3,control}.json` files in this directory.
