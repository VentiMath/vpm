# vgrpc-proto-loader benchmark evidence

Measured October 30, 2026 on Apple M1 Pro / macOS arm64 with Node 24.22.1 and
Bun 1.4.0. The reference is @grpc/proto-loader 0.8.1 with its locked protobuf
7.6.6 dependency. Negative changes mean less elapsed time. These are local schema
and codec timings, not cloud-request or application latency measurements.

## Method

[compare.cjs](../compare.cjs) uses three fresh processes per runtime and one
identical-upstream control. Each case gets 150 ms of warmup per variant and four
full warmup blocks, followed by twelve alternating paired rounds. An upstream
pilot targets 15 ms per block, capped at 100,000 operations. Results are retained
and validated outside timing, with no sample trimming. Reports preserve every
sample, runtime metadata and source hashes. CPU-heavy checks were stopped during
measurement.

Schema cases cover five methods with maps/int64/oneofs, 100 methods sharing the
same types, and the full Firestore 9.4.0 schema. File reads use the small upstream
RPC fixture with a warm filesystem cache. Descriptor imports use encoded bytes
or a plain descriptor object, not another protobuf runtime's message instance.
The known protobuf-7 descriptor-map serialization failure is tested separately;
these import benchmarks validate the resulting service definition only.

The protobuf-8 control keeps the original loader on stock protobuf 8.8.1. It
helps distinguish the 7-to-8 engine upgrade from the VPM stack's other changes,
but still uses upstream camel-case and Long implementations. It does not isolate
one optimization. gax 6.14.0 cases share one compiled caller and identical
forwarding overhead, forcing each load past gax's schema cache. Codec cases
serialize/deserialize a message containing int64, Unicode, bytes, a map, repeated
values, an enum and a oneof.

Times are pooled median nanoseconds per operation. Changes are the median of
paired ratios, which need not equal the ratio of the displayed time medians.

## Results

| Operation | Node upstream → VPM, ns | Node paired change | Bun upstream → VPM, ns | Bun paired change |
| --- | ---: | ---: | ---: | ---: |
| JSON, five RPC methods | 119,242 → 76,449 | −37.5% | 87,179 → 56,149 | −32.7% |
| JSON, 100 shared-type methods | 1,588,462 → 961,738 | −38.6% | 899,969 → 558,839 | −40.2% |
| JSON, full Firestore schema | 5,547,632 → 3,708,056 | −33.3% | 4,380,387 → 3,157,005 | −29.9% |
| Firestore, protobuf-8 control | 4,646,201 → 3,745,167 | −19.0% | 3,596,444 → 2,917,621 | −20.3% |
| File, synchronous load | 58,538 → 47,374 | −19.0% | 51,416 → 45,141 | −15.0% |
| File, asynchronous load | 122,484 → 105,732 | −11.4% | 89,927 → 79,203 | −16.5% |
| Descriptor set, bytes | 172,859 → 95,493 | −45.9% | 137,040 → 74,381 | −46.7% |
| Descriptor set, plain object | 168,324 → 88,277 | −47.3% | 117,937 → 68,493 | −43.8% |
| RPC serialization | 993 → 566 | −43.6% | 611 → 583 | −5.0% |
| RPC deserialization | 1,105 → 747 | −32.7% | 733 → 603 | −19.3% |
| gax, forced small schema load | 154,579 → 104,235 | −34.2% | 104,396 → 72,737 | −32.2% |
| gax, forced Firestore schema load | 6,082,312 → 4,566,312 | −27.9% | 4,447,979 → 3,191,587 | −27.4% |

The full gax/Firestore load improves across all three processes: −31.2% to −20.1%
on Node and −31.0% to −26.1% on Bun, with controls at −0.6% and +0.8%. These
results support a schema-loading improvement; no network request is timed.

Two smaller results are inconclusive: Node's asynchronous file load improves
11.4%, but its identical-upstream control moves −18.6%; Bun serialization improves
5.0% against a +4.1% control, with process medians ranging from −14.6% to −0.4%.
Do not treat either as an established speedup.

Other substantial control movements constrain precision: Node's direct Firestore
load is +11.2% and small gax load +13.2%; Bun's plain descriptor import is +12.2%
and deserialization −11.1%. The measured gains in those cases are larger and
consistent across processes, but the exact percentages are machine/run dependent.
All raw samples and controls are retained, including these noisy cases.

## Reproduce

Install the [comparison fixtures](../../../../scripts/grpc-loader-conformance/README.md),
then run from the repository root without other CPU-heavy work:

```sh
OUTPUT=/tmp/grpc-node.json node packages/vgrpc-proto-loader/bench/compare.cjs
OUTPUT=/tmp/grpc-bun.json bun packages/vgrpc-proto-loader/bench/compare.cjs
CALIBRATION=1 OUTPUT=/tmp/grpc-node-control.json node packages/vgrpc-proto-loader/bench/compare.cjs
CALIBRATION=1 OUTPUT=/tmp/grpc-bun-control.json bun packages/vgrpc-proto-loader/bench/compare.cjs
node packages/vgrpc-proto-loader/bench/summarize.cjs --verify-current
```

Repeat measurement commands in three fresh processes per runtime. The summary
reads the committed `node-{1,2,3,control}.json` and `bun-{1,2,3,control}.json` files.
