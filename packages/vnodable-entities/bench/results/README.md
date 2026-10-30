# Entity codec benchmarks

Compared with @nodable/entities 3.1.0 on Apple M1 Pro / macOS arm64,
October 30, 2026: Node 24.22.1 and Bun 1.4.0. Three fresh processes and one
identical-upstream calibration per runtime. Each process runs 12 alternating
paired rounds after 150 ms warmup per variant and four full warmup blocks;
iterations target 15 ms from an upstream pilot, capped at 100,000 operations.
Outputs are retained and checked outside timing. No samples are discarded.

Times below are pooled median nanoseconds per operation. Changes are pooled
medians of **paired round ratios**, which need not equal a ratio of the displayed
medians. Process columns list each process's median paired change. Positive
changes are regressions. Controls run upstream against itself, not VPM.

## Node

| Case | Upstream → VPM ns | Paired change | Three process changes | Upstream control |
| --- | ---: | ---: | --- | ---: |
| construct default decoder | 397 → 118 | -70.4% | -70.3%, -70.7%, -69.8% | +0.6% |
| construct parser decoder | 567 → 394 | -30.7% | -30.7%, -32.1%, -30.1% | -0.6% |
| decode plain XML text | 18 → 19 | +3.1% | +1.8%, +4.1%, +2.9% | -0.2% |
| decode XML references | 9,908 → 7,461 | -27.0% | -26.5%, -29.1%, -26.3% | +0.8% |
| decode sparse 8 KiB text | 19,666 → 305 | -98.5% | -98.5%, -98.5%, -98.5% | -0.9% |
| decode numeric references | 5,089 → 3,014 | -40.6% | -41.2%, -41.0%, -40.0% | +0.7% |
| decode named references | 6,514 → 4,697 | -27.2% | -24.5%, -29.8%, -28.4% | +1.1% |
| register and enforce document limit | 221 → 154 | -29.8% | -37.6%, -29.2%, -30.0% | +0.4% |
| construct named encoder | 32,947 → 80 | -99.8% | -99.8%, -99.8%, -99.8% | +1.2% |
| encode dense XML characters | 801 → 895 | +11.9% | +11.6%, +11.3%, +14.4% | -1.2% |
| encode sparse 8 KiB text | 26,208 → 1,264 | -95.2% | -95.0%, -95.1%, -95.2% | -0.7% |
| encode named Unicode | 961 → 932 | -2.5% | -2.0%, -4.7%, -1.9% | -2.0% |

## Bun

| Case | Upstream → VPM ns | Paired change | Three process changes | Upstream control |
| --- | ---: | ---: | --- | ---: |
| construct default decoder | 263 → 70 | -74.0% | -72.3%, -75.5%, -73.5% | -1.0% |
| construct parser decoder | 409 → 340 | -16.2% | -17.5%, -35.9%, -12.1% | +0.5% |
| decode plain XML text | 21 → 15 | -27.4% | -26.6%, -27.8%, -27.1% | -0.1% |
| decode XML references | 6,683 → 5,122 | -22.8% | -23.5%, -22.8%, -23.5% | +3.6% |
| decode sparse 8 KiB text | 7,313 → 293 | -96.0% | -95.9%, -96.0%, -96.0% | +0.2% |
| decode numeric references | 3,649 → 3,904 | +7.8% | -1.1%, +13.0%, +6.9% | -2.9% |
| decode named references | 5,869 → 4,553 | -22.1% | -27.3%, -24.2%, -19.2% | -2.3% |
| register and enforce document limit | 154 → 118 | -24.2% | -26.6%, -23.6%, -21.3% | -0.9% |
| construct named encoder | 41,155 → 75 | -99.8% | -99.8%, -99.8%, -99.8% | -1.5% |
| encode dense XML characters | 1,059 → 947 | -6.6% | -6.6%, -25.5%, -3.1% | -1.5% |
| encode sparse 8 KiB text | 17,769 → 2,817 | -83.9% | -83.9%, -84.6%, -83.1% | +4.5% |
| encode named Unicode | 738 → 793 | +7.5% | +10.5%, +9.3%, +1.5% | -0.6% |

## Interpretation and limits

XML-reference decoding improves about **27% on Node and 23% on Bun**. Sparse
8 KiB decoding improves 96–99% by jumping over literal spans, while still checking
whole numeric tokens and applying expansion policies. Default decoder construction
improves 70–74%. Parser-shaped construction improves 31% and 16%; that case includes
a fresh XML table spread, unlimited count, a finite growth budget and a hook.

The named encoder construction result measures **warmed reuse of the same frozen
ALL_ENTITIES table**. VPM shares its compiled trie across those instances; upstream
rebuilds it. The roughly 99.8% reduction is not a first-use or cold-import claim.
Mutable maps and maps with accessor properties are compiled independently.

Sparse encoding improves 95% on Node and 84% on Bun. This case includes the same
input-string construction on both sides. Named-Unicode encoding is approximately
tied with control noise on Node; no reliable gain is claimed there.

Remaining regressions are explicit: Node's dense XML encoder rises **801 → 895 ns**
(+11.9%), and plain decoding adds roughly 1 ns. Bun's numeric decoder rises
**3,649 → 3,904 ns** (+7.8%, with variable process results), and named-Unicode
encoding rises **738 → 793 ns** (+7.5%). The codecs retain stricter validation,
private state and arbitrary-length named matching. These measurements alone do
not isolate the cost of each correctness change.

Raw samples retain source/harness hashes and runtime metadata. These are codec
microbenchmarks, not complete XML parsing or Storage uploads, and do not establish
an application speedup or imply a deployed replacement.

## Reproduce

From the repository root, after installing the conformance fixture:

```sh
for runtime in node bun; do
  for run in 1 2 3; do
    OUTPUT="packages/vnodable-entities/bench/results/$runtime-$run.json" "$runtime" packages/vnodable-entities/bench/compare.cjs
  done
  CALIBRATION=1 OUTPUT="packages/vnodable-entities/bench/results/$runtime-control.json" "$runtime" packages/vnodable-entities/bench/compare.cjs
done
node -e "require('./scripts/bench-paired.cjs').summarize(require('node:path').resolve('packages/vnodable-entities'))" -- --verify-current
```

Run benchmarks sequentially without concurrent test loads. Source hash
verification rejects measurements from another implementation.
