# Matcher benchmarks

Compared with path-expression-matcher 1.6.2 on Apple M1 Pro / macOS arm64,
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
| construct simple expression | 314 → 181 | -42.8% | -42.8%, -43.2%, -42.2% | +1.2% |
| construct predicate expression | 641 → 539 | -16.2% | -15.7%, -17.1%, -16.2% | +0.3% |
| create matcher and view | 33 → 52 | +59.6% | +56.6%, +60.1%, +60.5% | -0.2% |
| XML sibling push and pop | 46 → 46 | -2.3% | -3.9%, +4.3%, -1.7% | +0.5% |
| walk multipart XML paths | 1,446 → 1,031 | -28.9% | -24.4%, -29.1%, -30.3% | -0.3% |
| match exact path | 24 → 19 | -21.6% | -21.2%, -21.6%, -23.3% | +0.1% |
| match deep path | 31 → 29 | -8.5% | -7.8%, -8.2%, -9.9% | -0.7% |
| indexed expression set hit | 72 → 54 | -24.1% | -22.5%, -23.0%, -29.1% | +0.7% |
| cached view path string | 9 → 9 | +5.2% | +5.3%, +5.3%, +5.2% | -0.4% |
| snapshot and restore | 416 → 1,222 | +196.0% | +197.4%, +180.3%, +201.2% | -0.5% |

## Bun

| Case | Upstream → VPM ns | Paired change | Three process changes | Upstream control |
| --- | ---: | ---: | --- | ---: |
| construct simple expression | 406 → 223 | -44.3% | -50.6%, -49.2%, -39.6% | -0.7% |
| construct predicate expression | 744 → 663 | -4.5% | -4.8%, -3.4%, -14.8% | +0.1% |
| create matcher and view | 39 → 39 | +2.5% | +8.6%, -6.8%, +9.3% | +3.8% |
| XML sibling push and pop | 44 → 42 | +3.7% | -3.1%, +5.8%, -8.2% | +0.2% |
| walk multipart XML paths | 1,284 → 1,134 | -12.8% | -9.8%, -15.8%, -16.9% | +2.0% |
| match exact path | 41 → 16 | -61.3% | -41.4%, -63.0%, -61.6% | +0.7% |
| match deep path | 40 → 41 | -0.2% | +0.6%, -13.4%, +0.3% | -0.2% |
| indexed expression set hit | 75 → 61 | -21.4% | -22.5%, -15.5%, -18.5% | -0.0% |
| cached view path string | 20 → 21 | +3.8% | -0.4%, +5.0%, +2.4% | -0.0% |
| snapshot and restore | 455 → 654 | +24.8% | +36.5%, +48.4%, +18.7% | +3.1% |

## Interpretation and limits

Simple expression construction improves about 43–44%; predicate construction,
exact matching and indexed-set lookup also improve in these runs. The simulated
four-part XML traversal improves **29% on Node and 13% on Bun**. It includes
reset, push/pop and first path-string reads, using Storage-shaped tag names;
it is not an end-to-end upload or complete XML parser benchmark.

A private compiled representation avoids repeatedly walking frozen inspection
arrays. A single deep wildcard uses direct rooted prefix/suffix comparisons;
multiple wildcards retain the independently tested iterative search. Construction
still validates syntax, and inspection copies remain immutable.

Remaining costs are explicit: creating a matcher plus frozen view rises from
33 to 52 ns on Node (about 60%); Bun's result is variable and near the control
noise. Cached view string reads add roughly 0–1 ns. Sibling push/pop varies
between processes, so no stable gain is claimed. The deep-match case is faster
on Node and approximately tied on Bun.

Snapshot/restore is **416 → 1,222 ns on Node**, and **455 → 654 ns on Bun**
(paired changes +196% and +25%). It copies attribute records, preserves separate
namespace maps and validates restore inputs before changing state. Upstream does
less work and shares attribute records. These operations are not used by the
exercised XML/Storage callers, so further tuning is deferred rather than weakening
state isolation. Nested attribute values still remain shared references.

Raw samples retain source/harness hashes and runtime metadata. The upstream
control and process spread matter most for these very short operations. These
results do not claim an application speedup or imply a deployed replacement.

## Reproduce

From the repository root, after installing the conformance fixture:

```sh
for runtime in node bun; do
  for run in 1 2 3; do
    OUTPUT="packages/vpath-expression-matcher/bench/results/$runtime-$run.json" "$runtime" packages/vpath-expression-matcher/bench/compare.cjs
  done
  CALIBRATION=1 OUTPUT="packages/vpath-expression-matcher/bench/results/$runtime-control.json" "$runtime" packages/vpath-expression-matcher/bench/compare.cjs
done
node -e "require('./scripts/bench-paired.cjs').summarize(require('node:path').resolve('packages/vpath-expression-matcher'))" -- --verify-current
```

Run benchmarks sequentially without concurrent test loads. Source hash
verification rejects measurements from another implementation.
