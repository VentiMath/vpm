# vjson-bigint benchmark evidence

Node 24.22.1 and Bun 1.4.0 on Apple M1 Pro, macOS arm64. Three fresh processes
and an identical-upstream control per runtime; 12 alternating paired rounds after
warmup. No trimming. Values are nanoseconds per operation; percentage changes are
medians of paired ratios, so they can differ from ratios of pooled medians.

| Case | Node upstream → VPM | Node change | Bun upstream → VPM | Bun change |
| --- | ---: | ---: | ---: | ---: |
| Metadata object | 1,794 → 1,174 | −31.4% | 1,184 → 810 | −31.7% |
| Small ordinary object | 1,411 → 948 | −31.4% | 1,457 → 1,759 | +6.9% |
| Native bigint event parse | 1,713 → 839 | −51.7% | 2,343 → 841 | −63.7% |
| Large integer array | 41,845 → 20,834 | −51.6% | 33,718 → 8,696 | −75.7% |
| Escaped strings | 8,608 → 1,732 | −79.6% | 5,089 → 2,110 | −59.3% |
| Exact number stringify | 674 → 526 | −22.6% | 399 → 264 | −33.2% |
| Ordinary stringify | 853 → 964 | +14.0% | 609 → 627 | +0.1% |
| Native bigint stringify | 640 → 779 | +29.5% | 580 → 660 | +14.9% |
| Malformed JSON | 2,849 → 9,933 | +234.5% | 1,883 → 1,274 | −33.2% |

Node control differences span −1.6% to +4.9%; Bun −3.1% to +3.4%. Small-object
Bun parsing spans −3.3% to +12.6% across processes, and ordinary Bun serialization
spans −4.4% to +2.4%; neither is a reliable improvement. The native-bigint stringify
overhead is repeatable and remains documented. VPM adds boxed-value correctness,
cycle/depth checks and reentrant state. Malformed Node parsing constructs a real
SyntaxError with a stack; upstream throws a plain object containing the source.
This intentionally different error contract costs about seven microseconds in
this workload. BigNumber arithmetic is excluded from both workloads.

The benchmark retains and validates outputs outside timing. Reports record source
hashes, runtime/CPU details, calibration flags and every sample. Reproduce with:

```sh
for runtime in node bun; do
  for run in 1 2 3; do
    OUTPUT=packages/vjson-bigint/bench/results/$runtime-$run.json $runtime packages/vjson-bigint/bench/compare.cjs
  done
  CALIBRATION=1 OUTPUT=packages/vjson-bigint/bench/results/$runtime-control.json $runtime packages/vjson-bigint/bench/compare.cjs
done
node packages/vjson-bigint/bench/summarize.cjs --verify-current
```

These are codec microbenchmarks, not application throughput measurements.
