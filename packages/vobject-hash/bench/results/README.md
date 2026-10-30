# Object-hash measurements

object-hash 3.0.0 versus VPM on Node **24.22.1** and Bun **1.4.0**, Apple M1 Pro,
macOS arm64. Negative changes mean less CPU time per operation.

Three fresh processes and one identical-upstream control per runtime. Each case
uses 150 ms warmup per variant, four full warmup blocks and twelve alternating
paired rounds. The pilot targets 15 ms per block, capped at 100,000 operations.
Outputs are retained and checked outside timing; samples are not trimmed.
JSON files retain every sample, source hashes, fixture lock and runtime details.

| Case | Node upstream → VPM, ns | Paired change | Bun upstream → VPM, ns | Paired change |
| --- | ---: | ---: | ---: | ---: |
| short string / default | 2,180 → 476 | −78.2% | 1,110 → 591 | −46.9% |
| gax JSON string / default | 2,238 → 567 | −74.2% | 1,222 → 712 | −42.5% |
| 64KiB string / default | 32,670 → 30,578 | −6.5% | 37,613 → 36,892 | −2.7% |
| nested record / default | 17,124 → 15,631 | −8.7% | 19,529 → 19,899 | +1.2% |
| nested record / SHA256 options | 5,389 → 4,313 | −19.3% | 5,244 → 5,339 | +2.7% |
| unordered set / text | 5,573 → 4,438 | −19.0% | 5,011 → 5,036 | −0.7% |
| framed binary buffer / 64KiB | 30,292 → 28,581 | −5.8% | 29,188 → 29,043 | −0.6% |
| unordered binary buffers | 5,808 → 4,189 | −28.8% | 5,170 → 4,778 | −4.8% |
| gax gRPC proto cache hit | 2,947 → 1,145 | −60.9% | 1,655 → 1,021 | −38.7% |
| gax gRPC forced proto load | 26,922 → 24,258 | −13.7% | 16,982 → 15,398 | −7.9% |
| gax fallback proto cache hit | 2,951 → 1,144 | −61.1% | 1,651 → 936 | −43.0% |
| gax fallback forced proto load | 14,849 → 12,281 | −17.4% | 6,732 → 5,932 | −13.0% |

Times are medians of all 36 samples. Changes are medians of paired ratios, so
percentages can differ from ratios of the two pooled time medians. The binary
cases intentionally use corrected VPM digests; both expected outputs are checked.
These are local CPU costs, not application or network speedups.

## Callers and controls

The gax cases execute the actual installed 6.14.0 gRPC/fallback implementations,
with only the object-hash import replaced. Cache hits include JSON.stringify,
hashing and lookup. Forced loads additionally run the real proto-loader/grpc-js
or protobufjs work. Each variant gets an independent class/cache. No network
operations are involved.

| Case | Node per-process changes | Node control | Bun per-process changes | Bun control |
| --- | --- | ---: | --- | ---: |
| short string / default | −76.5%, −78.4%, −78.6% | +0.1% | −49.3%, −44.4%, −45.9% | +0.6% |
| gax JSON string / default | −73.2%, −73.4%, −75.0% | −3.1% | −41.4%, −46.1%, −45.2% | +4.5% |
| 64KiB string / default | −5.3%, −6.7%, −7.7% | +1.5% | −4.1%, −0.6%, −5.3% | −1.5% |
| nested record / default | −8.3%, −8.8%, −8.1% | −0.2% | −0.2%, +0.9%, +5.4% | +0.1% |
| nested record / SHA256 options | −19.6%, −21.5%, −18.8% | −2.0% | +5.3%, +3.2%, +0.3% | −3.8% |
| unordered set / text | −19.5%, −19.6%, −18.8% | −1.0% | −0.9%, −3.2%, +0.8% | −2.6% |
| framed binary buffer / 64KiB | −4.8%, −5.5%, −6.6% | −0.5% | −0.5%, −1.6%, −0.5% | −0.6% |
| unordered binary buffers | −27.2%, −32.4%, −28.2% | +1.9% | −2.4%, −7.2%, −7.5% | −1.2% |
| gax gRPC proto cache hit | −61.2%, −60.9%, −60.5% | +0.9% | −38.4%, −33.1%, −40.3% | +8.0% |
| gax gRPC forced proto load | −10.6%, −13.6%, −19.3% | −0.4% | −6.2%, −6.0%, −11.8% | +4.7% |
| gax fallback proto cache hit | −59.9%, −62.4%, −59.0% | −5.5% | −43.0%, −44.0%, −43.3% | +0.3% |
| gax fallback forced proto load | −11.9%, −20.5%, −19.7% | −4.0% | −14.3%, −11.0%, −11.0% | +1.8% |

Short strings and the actual cache-hit paths show consistent improvements well
beyond their controls. Large inputs spend more time in native hashing, so their
relative improvement is smaller. Forced loads include other SDK costs and vary
more between processes. Bun nested-record hashing is 1.2% slower with defaults and 2.7% slower with
explicit SHA-256 options. The latter is smaller than its 3.8% control offset;
these remain recorded costs, not claimed gains. Small changes near their
corresponding control offset should not be interpreted as reliable gains.

## Reproduce

Install `scripts/object-hash-conformance`, then run
`node packages/vobject-hash/bench/compare.cjs` (or `bun`). Set `OUTPUT` to retain
a report and `CALIBRATION=1` to use upstream for both variants. Run benchmarks
sequentially without concurrent test suites.

```sh
node -e "require('./scripts/bench-paired.cjs').summarize(require('node:path').resolve('packages/vobject-hash'))" -- --verify-current
```
